import fetch from 'node-fetch';
import React from 'react';

const response = await fetch('https://ue3b2jb6robht6kl62ekulzh7y0dcdrw.lambda-url.us-east-1.on.aws/');
const data = await response.json();
data = JSON.stringify(data);
console.log(data);

const MyComponent: React.FC = () => {
  return (
    <div>
      <h1>{data}</h1>
    </div>
  );
};
