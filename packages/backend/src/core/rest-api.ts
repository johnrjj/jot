import * as bodyParser from 'body-parser';
import { Router } from 'express';
import { Logger } from 'winston';
import { IDocumentRepository, serializeDoc } from './document-repository';

const v0ApiRouterFactory = (documentRepository: IDocumentRepository, logger: Logger) => {
  const router = Router();
  router.use(bodyParser.json({ type: '*/*' }));
  router.use(bodyParser.urlencoded({ extended: true }));

  logger.verbose('REST API Route: /doc/:docId [GET] setup');
  router.get('/doc/:docId', async (req, res) => {
    const { docId } = req.params;
    const doc = await documentRepository.getDoc(docId);
    if (!doc) {
      return res.sendStatus(404);
    }
    const docString = serializeDoc(doc);
    res.json({ serializedDocument: docString });
  });

  return router;
};

export { v0ApiRouterFactory };
