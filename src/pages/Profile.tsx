// src/pages/Profile.tsx
import { useEffect, useState, useCallback } from 'react';
import { useApi } from "../services/api";

const Profile = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);  
  const api = useApi();
  const fetchdata = useCallback(async () => {
    try {
      const response = await api.get('/profile');
      console.log(response);
      if (response) {
        setData(response);
      } else {
        setError('Failed to fetch profile data');
      }
    } catch (err: any) {
      console.log("get request failed");
      setError('Failed to fetch profile data');
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

export default Profile;
