class SecretsManagerClient {
  constructor() {}
  
  send() {
    return Promise.resolve({
      SecretString: JSON.stringify({
        host: 'test-host',
        port: 5432,
        dbname: 'brightboost',
        username: 'postgres',
        password: 'test-password'
      })
    });
  }
}

class GetSecretValueCommand {
  constructor(params) {
    this.params = params;
  }
}

module.exports = {
  SecretsManagerClient,
  GetSecretValueCommand
};
