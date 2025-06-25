// src/pages/Profile.tsx
import { useEffect, useState, useCallback } from 'react';
import { useApi } from "../services/api";

const App = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);  
  const api = useApi();
  const fetchdata = useCallback(async () => {
    try {
      const response = await api.get('https://ue3b2jb6robht6kl62ekulzh7y0dcdrw.lambda-url.us-east-1.on.aws/'); // Example GET URL
      console.log(response);
      setData(response.data);
    } catch (err: any) {
      console.log("get request failed");
      return;
    }
  }, [api]);
  useEffect(() => {
    fetchdata();
  }, [fetchdata]);
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Your Information</h1>
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
