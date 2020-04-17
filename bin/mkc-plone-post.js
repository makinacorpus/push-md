#!/usr/bin/env node

require('dotenv').config();
const FormData = require('form-data');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const prompt = require('prompt');

const { render } = require('../lib/render-md.js');

const doPublish = process.argv.includes('--publish');

(async () => {
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    let frontmatter;
    let htmlSource;

    const sourcetype = path.extname(process.argv[2]);
    const sourcefile = fs.readFileSync(process.argv[2]).toString();

    switch (sourcetype) {
      case '.html':
        htmlSource = sourcefile;
        frontmatter = {};
        break;
      case '.md':
      default: {
        const rendered = await render(sourcefile);
        frontmatter = rendered.frontmatter;
        htmlSource = rendered.html;
      }
    }

    prompt.start();

    const properties = {};

    if (!process.env.USER) {
      properties.tri = {
        description: 'Utilisateur',
        message: 'Ce champs est requis',
        required: true,
      };
    }

    if (!process.env.PASS) {
      properties.passwd = {
        description: 'Mot de passe (non stocké)',
        message: 'Ce champs est requis',
        replace: '*',
        required: true,
        hidden: true,
      };
    }

    if (!frontmatter.url) {
      properties.postpath = {
        description: 'Chemin complet du end-point de l\'article',
        message: 'Ce champs est requis',
        required: true,
      };
    }

    prompt.get({ properties }, async (err, result) => {
      if (err) throw err;

      const body = new FormData();
      body.append('text', htmlSource);

      const user = result.tri || process.env.USER;
      const pass = result.passwd || process.env.PASS;

      const auth = Buffer.from(`${user}:${pass}`).toString('base64');
      const headers = {
        Authorization: `Basic ${auth}`,
      };

      const postPath = frontmatter.url || result.postpath;

      if (doPublish) {
        const response = await fetch(`https://edit.makina-corpus.com${postPath}/update-content`, {
          method: 'POST',
          headers,
          body,
        });
        // eslint-disable-next-line no-console
        console.log(await response.text());
      } else {
        // eslint-disable-next-line no-console
        console.log(htmlSource);
      }
    });
  }
})();
