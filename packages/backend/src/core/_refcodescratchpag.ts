// handleSocket(ws, req) {
//   console.log('open')
//   const docSet = new DocSet()

//   docSet.registerHandler((id, doc) => console.log('handler', id, doc))

//   let subscribedDocuments = [] // Document[]
//   let subscribingDocuments = [] // { id: string, cancel: boolean }[]
//   const removeFromSubscribedDocuments = id => {
//     subscribingDocuments = subscribingDocuments.filter(d => d.id !== id)
//     subscribedDocuments = subscribedDocuments.filter(d => d.id !== id)
//   }

//   const send = (action, data) =>
//     console.log('sending', action, data) ||
//     ws.send(JSON.stringify({ action, ...data }))

//   const autocon = new Automerge.Connection(docSet, data => {
//     send('automerge', { data })
//   })

//   const subscribeToDoc = id => {
//     if (
//       subscribingDocuments.some(a => a.id === id) ||
//       subscribedDocuments.some(a => a.id === id)
//     ) {
//       send('error', {
//         message: 'Already subscribed or subscribing',
//         id,
//       })
//       return
//     }
//     subscribingDocuments.push({ id, cancel: false })

//     this.checkAccess(id, req)
//       .then(access => {
//         if (access) {
//           return this.getDoc(id)
//         } else {
//           send('error', {
//             message: 'Access denied',
//             id,
//           })
//           removeFromSubscribedDocuments(id)
//           return null
//         }
//       })
//       .then(doc => {
//         if (doc === null) return
//         if (doc === false) {
//           // 404
//           send('error', {
//             message: 'Document not found',
//             id,
//           })
//           removeFromSubscribedDocuments(id)
//         } else {
//           const { cancel } = subscribingDocuments.find(d => d.id === id)
//           if (!cancel) {
//             doc.addToSet(docSet)
//             subscribedDocuments.push(doc)
//             send('subscribed', { id })
//           }
//           subscribingDocuments = subscribingDocuments.filter(d => d.id !== id)
//         }
//       })
//       .catch(e => {
//         removeFromSubscribedDocuments(id)
//         send('error', {
//           message: 'Internal server error',
//           id,
//         })
//         console.error('Error occurred while checking access for ' + id)
//         console.error(e)
//       })
//   }

//   const unsubscribe = id => {
//     const subscribing = subscribingDocuments.find(d => d.id === id)
//     if (subscribing) {
//       subscribing.cancel = true
//     } else {
//       const subscribed = subscribedDocuments.find(d => d.id === id)
//       subscribed.removeFromSet(docSet)
//       subscribedDocuments = subscribedDocuments.filter(d => d.id !== id)
//     }
//   }

//   const automergeMessage = data => {
//     console.log(data)
//     if (subscribedDocuments.some(doc => doc.id === data.docId)) {
//       autocon.receiveMsg(data)
//     } else {
//       send('error', {
//         message: 'Sending changes to doc which you are not subscribed to',
//       })
//     }
//   }

//   const handleFrame = frame => {
//     console.log('handling', frame)
//     if (frame.action === 'automerge') {
//       automergeMessage(frame.data)
//     } else if (frame.action === 'error') {
//       console.error('Recieved error frame from client', frame)
//     } else if (frame.action === 'subscribe') {
//       frame.ids.forEach(id => subscribeToDoc(id))
//     } else if (frame.action === 'unsubscribe') {
//       frame.ids.forEach(id => unsubscribe(id))
//     } else {
//       send('error', {
//         message: 'Unknown action ' + frame.action,
//       })
//     }
//   }

//   ws.on('message', message => {
//     try {
//       const frame = JSON.parse(message.toString())
//       if (typeof frame === 'object' && frame !== null) {
//         handleFrame(frame)
//       }
//     } catch (e) {
//       console.error(e)
//     }
//   })

//   autocon.open()

//   ws.on('close', () => {
//     console.log('close')
//     autocon.close()
//     subscribedDocuments.forEach(doc => doc.removeFromSet(docSet))
//   })
// }
// }

// class Document {
//   doc: any;
//   id: string;
//   sets: Array<any>;
//   onChange: Function;
//   constructor(id: string, onChange: Function) {
//     this.sets = [] // { set, handler }
//     this.id = id
//     this.onChange = onChange
//   }

//   set(doc: any) {
//     this.doc = doc
//     this.onChange(this.id, this.doc)

//     for (const set of this.sets) {
//       set.setDoc(this.id, this.doc)
//     }
//     return this
//   }

//   addToSet(docSet: any) {
//     if (this.sets.some(set => set.set === docSet)) {
//       // prevent adding twice
//       return
//     }

//     docSet.setDoc(this.id, this.doc)

//     const handler = (docId: string, doc: any) => {
//       console.log('handler', docId, doc)
//       if (docId !== this.id) return // not this doc
//       if (doc === this.doc) return // already handled
//       this.doc = doc
//       this.onChange(this.id, this.doc)

//       for (const other of this.sets) {
//         if (other.set === docSet) continue
//         other.set.setDoc(docId, doc)
//       }
//     }
//     docSet.registerHandler(handler)
//     this.sets.push({ set: docSet, handler })
//   }

//   removeFromSet(docSet: any) {
//     const set = this.sets.find(set => set.set === docSet)
//     if (!set) return // this doc is not in specified set

//     docSet.unregisterHandler(set.handler)
//     this.sets = this.sets.filter(set => set.set !== docSet)
//   }
// }