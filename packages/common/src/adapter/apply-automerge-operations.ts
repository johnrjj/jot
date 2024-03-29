/**
 * This converts Automerge operations to Slate operations.
 */

import automergeJsonToSlate from './automerge-json-to-slate';
/**
 * @function applyAutomergeOperations
 * @desc Update the client with a list of Automerge operations. If an error
 *     occurs, reload the document using Automerge as the ground truth.
 * @param {Array} opSetDiff - The Automerge operations generated by Automerge.diff
 * @param {Slate.Change} change - A Slate Change object
 * @param {function} failureCallback - (optional) Function to call if an error occurs
 * @returns {Slate.Change} The Slate Change operation with the applied Automerge operations
 */
export const applyAutomergeOperations = (opSetDiff: Array<any>, change: any, failureCallback: Function) => {
  try {
    const slateOps = convertAutomergeToSlateOps(opSetDiff);
    // Apply the operation
    return change.applyOperations(slateOps);
  } catch (e) {
    // If an error occurs, release the Slate Value based on the Automerge
    // document, which is the ground truth.
    console.info('The following warning is fine:');
    console.info(e);
    if (failureCallback) {
      failureCallback();
    }
  }
};

/**
 * @function convertAutomergeToSlateOps
 * @desc Converts Automerge operations to Slate operations.
 * @param {Array} automergeOps - a list of Automerge operations created from Automerge.diff
 * @return {Array} Array of Slate operations
 */
export const convertAutomergeToSlateOps = (automergeOps: Array<any>): Array<any> => {
  // To build objects from Automerge operations
  let slateOps: any[] = [];
  let objIdMap: any = {};
  let deferredOps: any[] = [];
  let containsDeferredOps = false;
  let temp;

  automergeOps.forEach((op, idx) => {
    switch (op.action) {
      case 'create':
        objIdMap = automergeOpCreate(op, objIdMap);
        break;
      case 'remove':
        temp = automergeOpRemove(op, objIdMap);
        objIdMap = temp.objIdMap;
        slateOps[idx] = temp.slateOps;
        break;
      case 'set':
        temp = automergeOpSet(op, objIdMap);
        objIdMap = temp.objIdMap;
        slateOps[idx] = temp.slateOps;
        break;
      case 'insert':
        temp = automergeOpInsert(op, objIdMap);
        objIdMap = temp.objIdMap;
        deferredOps[idx] = temp.deferredOps;
        slateOps[idx] = temp.slateOps;
        if (temp.deferredOps && !containsDeferredOps) {
          containsDeferredOps = true;
        }
        break;
      case 'del':
        console.warn('del action not coded (yet). This is usually generated by Automerge.changes()');
        console.warn('Use Automerge.diff() instead of Automerge.changes() to generate actionable ops.');
        break;
      default:
        console.error(`Unknown automerge op action recieved: ${op.action}`, op);
        break;
    }
  });

  if (containsDeferredOps) {
    automergeOpInsertText(deferredOps, objIdMap, slateOps);
  }
  return flattenArray(slateOps);
};

/**
 * @function automergeOpCreate
 * @desc Handles the `create` Automerge operation
 * @param {Object} op - Automerge operation
 * @param {Object} objIdMap - Map from the objectId to created object
 * @return {Object} Map from Object Id to Object
 */
const automergeOpCreate = (op: any, objIdMap: any): any => {
  switch (op.type) {
    case 'map':
      objIdMap[op.obj] = {};
      break;
    case 'list':
      objIdMap[op.obj] = [];
      break;
    default:
      console.error('`create`, unsupported type: ', op.type);
  }
  return objIdMap;
};

/**
 * @function automergeOpRemove
 * @desc Handles the `remove` Automerge operation
 * @param {Object} op - Automerge operation
 * @param {Object} objIdMap - Map from the objectId to created object
 * @return {Object} The objIdMap and array of corresponding Slate Operations for
 *     this operation
 */
const automergeOpRemove = (op: any, objIdMap: any): any => {
  let nodePath, slateOps;
  let pathString = op.path.slice(1).join('/');
  const lastObjectPath = op.path[op.path.length - 1];
  pathString = pathString.match(/\d+/g);

  if (objIdMap.hasOwnProperty(op.obj)) {
    objIdMap[op.obj].splice(op.index, 1);
  } else {
    switch (lastObjectPath) {
      case 'text':
        // Remove a character
        nodePath = pathString.map(x => {
          return parseInt(x, 10);
        });
        nodePath = nodePath.splice(0, nodePath.length - 1);

        slateOps = [
          {
            type: 'remove_text',
            path: nodePath,
            offset: op.index,
            text: '*',
            marks: [],
          },
        ];
        break;
      case 'nodes':
        // Remove a node
        if (pathString) {
          nodePath = pathString.map(x => {
            return parseInt(x, 10);
          });
          nodePath = [...nodePath, op.index];
        } else {
          nodePath = [op.index];
        }

        slateOps = [
          {
            type: 'remove_node',
            path: nodePath,
          },
        ];
        break;
      default:
        console.error('`remove`, unsupported node type:', lastObjectPath);
    }
  }
  return { objIdMap: objIdMap, slateOps: slateOps };
};

/**
 * @function automergeOpSet
 * @desc Handles the `set` Automerge operation
 * @param {Object} op - Automerge operation
 * @param {Object} objIdMap - Map from the objectId to created object
 * @return {Object} Map from Object Id to Object
 */
const automergeOpSet = (op, objIdMap) => {
  let slateOps: Array<any> = [];
  if (op.hasOwnProperty('link')) {
    // What's the point of the `link` field? All my experiments
    // have `link` = true
    if (op.link) {
      // Check if linking to a newly created object or one that
      // already exists in our Automerge document
      if (objIdMap.hasOwnProperty(op.value)) {
        objIdMap[op.obj][op.key] = objIdMap[op.value];
      } else {
        // TODO: Does this ever happen?
        console.error('`set`, unable to find objectId: ', op.value);
      }
    }
  } else {
    if (!objIdMap[op.obj]) {
      switch (op.type) {
        case 'map':
          objIdMap[op.obj] = {};
          break;
        case 'list':
          objIdMap[op.obj] = [];
          break;
        default:
          console.error('`create`, unsupported type: ', op.type);
      }
    }
    objIdMap[op.obj][op.key] = op.value;

    // Best heuristic right now for checking if its a set_node (setting h1 kinda thing)
    // find something better.
    if (op.path) {
      let pathString = op.path.slice(1).join('/');
      pathString = pathString.match(/\d+/g);
      let nodePath = pathString.map(x => {
        return parseInt(x, 10);
      });

      slateOps.push({
        object: 'operation',
        path: nodePath, // [0]
        properties: { type: op.value }, //op.value: "heading-one"
        type: 'set_node',
      });
    }
  }
  return { objIdMap, slateOps };
};

/**
 * @function automergeOpInsert
 * @desc Handles the `insert` Automerge operation
 * @param {Object} op - Automerge operation
 * @param {Object} objIdMap - Map from the objectId to created object
 * @return {Object} Containing the map from Object Id to Object,
 *     deferred operation, and array of Slate operations.
 */
const automergeOpInsert = (op, objIdMap) => {
  if (op.link) {
    // Check if inserting into a newly created object or one that
    // already exists in our Automerge document.
    if (objIdMap.hasOwnProperty(op.obj)) {
      objIdMap[op.obj].splice(op.index, 0, objIdMap[op.value]);
    } else {
      return { objIdMap: objIdMap, deferredOps: op };
    }
  } else {
    // If adding in a primitive to a list, then op.link is False.
    // This is used when adding in a character to the text field of a Leaf
    // node.
    if (objIdMap.hasOwnProperty(op.obj)) {
      objIdMap[op.obj].splice(op.index, 0, op.value);
    } else {
      let pathString = op.path.slice(1).join('/');
      pathString = pathString.match(/\d+/g);
      let nodePath = pathString.map(x => {
        return parseInt(x, 10);
      });
      nodePath = nodePath.splice(0, nodePath.length - 1);

      const slateOp = {
        type: 'insert_text',
        path: nodePath,
        offset: op.index,
        text: op.value,
        marks: [],
      };
      return { objIdMap: objIdMap, deferredOps: null, slateOps: [slateOp] };
    }
  }
  return { objIdMap: objIdMap };
};

/**
 * @function automergeOpInsertText
 * @desc Handles deferred operations
 * @param {Array} deferredOps - a list of deferred operations to process
 * @param {Object} objIdMap - Map from the objectId to created object
 * @param {Array} slateOps - List of created Slate operations
 * @return {Array} List of list of Slate operations
 */
const automergeOpInsertText = (deferredOps: Array<any>, objIdMap: any, slateOps: Array<any>): Array<any> => {
  // We know all ops in this list have the following conditions true:
  //  - op.action === `insert`
  //  - pathMap.hasOwnProperty(op.obj)
  //  - typeof pathMap[op.obj] === "string" ||
  //    pathMap[op.obj] instanceof String
  deferredOps.forEach((op, idx) => {
    if (op === undefined || op === null) return;

    const insertInto = op.path.slice(1).join('/');
    let pathString, nodePath;
    let slateOp: any[] = [];

    if (insertInto === 'nodes') {
      // If inserting into the "root" of the tree, the nodePath is []
      nodePath = [];
    } else {
      pathString = insertInto.match(/\d+/g);
      nodePath = pathString.map(x => {
        return parseInt(x, 10);
      });
    }

    const nodeToAdd = objIdMap[op.value];

    switch (nodeToAdd.object) {
      case 'text':
        // As of Slate 0.34, we don't enter this case any longer.
        slateOp.push({
          type: 'insert_text',
          path: nodePath,
          offset: op.index,
          text: objIdMap[op.value].text,
          marks: objIdMap[op.value].marks,
        });
        break;
      case 'block':
        const newNode = automergeJsonToSlate(nodeToAdd);
        nodePath.push(op.index);
        slateOp.push({
          type: 'insert_node',
          path: nodePath,
          node: newNode,
        });
        break;
      default:
        break;
    }

    slateOps[idx] = slateOp;
  });
  return slateOps;
};

/**
 * @function flattenArray
 * @desc Flattens an array of lists
 * @param {Array} array_of_lists - an array of list of Slate operations
 * @return {Array} Array of Slate operations
 */
const flattenArray = (array_of_lists: Array<any>) => {
  let newList: any[] = [];
  array_of_lists.forEach(items => {
    if (items !== null && items !== undefined) {
      items.forEach(item => {
        newList.push(item);
      });
    }
  });
  return newList;
};
