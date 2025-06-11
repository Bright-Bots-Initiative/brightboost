const sign = jest.fn().mockReturnValue('mock-jwt-token');
const verify = jest.fn().mockReturnValue({
  id: 1,
  email: 'test@example.com',
  role: 'TEACHER',
  name: 'Test User'
});

module.exports = {
  sign,
  verify
};
