import Automerge from 'automerge';
import Plain from 'slate-plain-serializer';
import uuid from 'uuid/v4';

const SYSTEM_GENERATED_ACTOR_ID = '000000000000';
const IPSUM_PARAGRAPH_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac ligula justo. Proin mollis, neque eu aliquam bibendum, nisi ligula consequat felis, at commodo nulla sapien in augue. Mauris in dignissim purus. Morbi sodales massa elit, sit amet varius tellus interdum nec. Maecenas consequat, ante eget facilisis cursus, elit quam condimentum neque, ut hendrerit neque massa vitae urna. Donec suscipit leo eros, et convallis nisl gravida ut. Nam at dolor neque. Vivamus egestas sit amet sapien eget molestie. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus varius tellus nulla, at luctus enim consectetur in. Proin placerat magna in velit eleifend, ac consectetur diam tincidunt. Proin augue augue, pellentesque sed tristique sodales, tristique quis metus.`;

import { slateCustomToJson } from '@jot/common/dist/adapter/slate-automerge-bridge';

const serializePlainTextToSlateValue = (text: string, toJSON: boolean = false) =>
  Plain.deserialize(IPSUM_PARAGRAPH_TEXT, { toJSON });

const createAutomergeDocFromJson = (json: any): Automerge.AutomergeRoot => {
  const blankDoc = Automerge.init(SYSTEM_GENERATED_ACTOR_ID);
  const hydratedDoc = Automerge.change(blankDoc, 'Hydrated Document with initial data', doc => {
    Object.keys(json).forEach(key => {
      doc[key] = json[key];
    });
  });
  return hydratedDoc;
};

const buildAutomergeDocState = (initialDocText: string) => {
  const slateValue = serializePlainTextToSlateValue(initialDocText);
  const automergeCompatibleJsonSlateValue = slateCustomToJson(slateValue);
  const automergeDoc = createAutomergeDocFromJson(automergeCompatibleJsonSlateValue);
  return automergeDoc;
};

const generateAutomergeDoc = (
  initialDocText: string,
  docId: string = uuid(),
): { doc: Automerge.AutomergeRoot; docId: string } => {
  const automergeDoc = buildAutomergeDocState(initialDocText);
  return {
    doc: automergeDoc,
    docId: docId,
  };
};

const generateSampleAutomergeDocFromIpsum = (docIdToAssign?: string) => {
  return generateAutomergeDoc(IPSUM_PARAGRAPH_TEXT, docIdToAssign);
};

export { generateAutomergeDoc, generateSampleAutomergeDocFromIpsum };
