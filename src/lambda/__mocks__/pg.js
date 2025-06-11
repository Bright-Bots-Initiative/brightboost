class Pool {
  constructor() {}
  
  connect() {
    return Promise.resolve({
      release: jest.fn()
    });
  }
  
  query() {
    return Promise.resolve({
      rows: [{
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'TEACHER',
        school: 'Test School',
        subject: 'Math',
        exists: true
      }],
      rowCount: 1
    });
  }
  
  end() {
    return Promise.resolve();
  }
}

module.exports = {
  Pool
};
