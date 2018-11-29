import Automerge from 'automerge';
import Plain from 'slate-plain-serializer';
import uuid from 'uuid/v4';
import { slateCustomToJson } from '@jot/common/dist/adapter/slate-automerge-bridge';

const SYSTEM_GENERATED_ACTOR_ID = '000000000000';
const IPSUM_PARAGRAPH_TEXT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed ac ligula justo. Proin mollis, neque eu aliquam bibendum, nisi ligula consequat felis, at commodo nulla sapien in augue. Mauris in dignissim purus. Morbi sodales massa elit, sit amet varius tellus interdum nec. Maecenas consequat, ante eget facilisis cursus, elit quam condimentum neque, ut hendrerit neque massa vitae urna. Donec suscipit leo eros, et convallis nisl gravida ut. Nam at dolor neque. Vivamus egestas sit amet sapien eget molestie. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus varius tellus nulla, at luctus enim consectetur in. Proin placerat magna in velit eleifend, ac consectetur diam tincidunt. Proin augue augue, pellentesque sed tristique sodales, tristique quis metus.`;
const HIPSUM_PARAGRAPH_TEXT = `Lorem ipsum dolor amet cornhole microdosing direct trade gentrify mustache four dollar toast palo santo gluten-free normcore XOXO cold-pressed man bun yuccie pinterest. Crucifix tote bag kitsch, umami meditation tattooed fashion axe before they sold out vape jean shorts listicle DIY. Pork belly narwhal pok pok thundercats lo-fi cornhole post-ironic brooklyn. Pour-over vegan plaid microdosing crucifix vinyl. Skateboard listicle wayfarers chartreuse, VHS artisan raclette. Hashtag food truck bespoke actually truffaut wolf bicycle rights schlitz intelligentsia pickled everyday carry butcher ennui sriracha. Kitsch marfa VHS austin tumeric green juice keytar sriracha single-origin coffee readymade bicycle rights authentic beard taiyaki craft beer. Typewriter squid poutine echo park XOXO pug af sustainable dreamcatcher wayfarers. Tattooed 90's ethical four dollar toast cronut pug cred bespoke PBR&B. Banjo glossier tbh, next level lomo craft beer food truck crucifix hell of waistcoat cardigan hella. Master cleanse paleo bicycle rights hoodie, 90's microdosing succulents etsy. Brunch meditation iceland, cardigan cray jean shorts salvia try-hard echo park. Everyday carry gochujang freegan drinking vinegar, tumeric pork belly kogi plaid sustainable pour-over cold-pressed air plant shoreditch tote bag.`;

const serializePlainTextToSlateValue = (text: string, toJSON: boolean = false) => Plain.deserialize(text, { toJSON });

const createAutomergeDocFromJson = (json: any): Automerge.AutomergeRoot => {
  const blankDoc = Automerge.init(SYSTEM_GENERATED_ACTOR_ID);
  const hydratedDoc = Automerge.change(blankDoc, 'Hydrated Document with initial data', doc =>
    Object.keys(json).forEach(key => (doc[key] = json[key])),
  );
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

const generateSampleAutomergeDocFromIpsum = (docIdToAssign?: string, hipsterMode: boolean = true) => {
  return generateAutomergeDoc(hipsterMode ? HIPSUM_PARAGRAPH_TEXT : IPSUM_PARAGRAPH_TEXT, docIdToAssign);
};

export { generateAutomergeDoc, generateSampleAutomergeDocFromIpsum };
