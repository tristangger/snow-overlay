const allRules = { 
  'fi-no-unsecure-cookie': require('./lib/rules/fi-no-unsecure-cookie.js'),
  'fi-no-frame-iframe': require('./lib/rules/fi-no-frame-iframe.js'),
  'fi-no-absolute-urls': require('./lib/rules/fi-no-absolute-urls.js'),
  'fi-no-document-write': require('./lib/rules/fi-no-document-write.js'),
  'fi-no-modify-history': require('./lib/rules/fi-no-history.js'),
  'fi-no-sync-calls': require('./lib/rules/fi-no-sync-calls.js'),
  'fi-no-post-message': require('./lib/rules/fi-no-postmessage.js')

};

function configureAsError(rules) {
  const result = {}; 
  for (const key in rules) result[`if6/${key}`] = 2;
  return result;
}

module.exports = { 
  rules: allRules,
  configs: {
    all: { rules: configureAsError(allRules) }
  }
}

