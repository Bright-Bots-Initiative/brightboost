import fetch from 'node-fetch';

const response = await fetch('https://9yjdjg9cwc.execute-api.us-east-1.amazonaws.com');
const data = await response.json();
