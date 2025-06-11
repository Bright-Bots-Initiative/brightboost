const hash = jest.fn().mockResolvedValue('hashedpassword');
const compare = jest.fn().mockImplementation((plaintext, hashed) => {
  console.log('bcrypt.compare called with:', { plaintext, hashed });
  return Promise.resolve(true);
});

module.exports = {
  hash,
  compare
};
