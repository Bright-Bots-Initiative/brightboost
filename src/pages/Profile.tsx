import { useState, useEffect } from 'react';

const App = () => {
   const [posts, setPosts] = useState([]);

   useEffect(() => {
      fetch('https://ue3b2jb6robht6kl62ekulzh7y0dcdrw.lambda-url.us-east-1.on.aws/')
         .then((res) => res.json())
         .then((data) => {
            console.log(data);
            setPosts(data);
         })
         .catch((err) => {
            console.log('nein');
         });
   }, []);
