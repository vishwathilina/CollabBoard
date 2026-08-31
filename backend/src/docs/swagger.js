const swaggerUi = require('swagger-ui-express');
const yaml = require('yamljs');
const path = require('path');

const setupSwagger = (app) => {
  const swaggerDocument = yaml.load(path.join(__dirname, '../../../docs/api/openapi.yaml'));
  
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
};

module.exports = setupSwagger;
