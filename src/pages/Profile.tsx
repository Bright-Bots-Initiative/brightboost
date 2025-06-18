// src/pages/Profile.tsx
import { useEffect, useState } from 'react';

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/posts/1') // Example GET URL
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(json => {
        setData(json);
      })
      .catch(err => {
        setError(err.message);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Fetch API GET Request Example</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default App;
