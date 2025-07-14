// src/pages/edit-profile.tsx
import { useState, useEffect, useCallback } from "react";
import { useApi } from "../services/api";

const Edit = () => {
  const api = useApi();
  
  const [profileUrl, setProfileUrl] = useState("DEFAULT PROFILE URL");
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user_data = await api.get("/profile");
        const parsed = JSON.parse(user_data);
        setProfileUrl(parsed.avatar);
      } catch (err: any) {
        console.log("Failed to get image");
      }
    };

    fetchProfile();
  }, [api]);
  
  const edit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name");
      const school = formData.get("school");
      const subject = formData.get("subject");
      const data = {
        name: name,
        school: school,
        subject: subject,
      };
      const response = await api.post("/api/edit-profile", data);
      console.log(response);
    },
    [api],
  );
  return (
    <>
    <img 
      src = {profileUrl}
      alt="profile picture"
      />
    <form onSubmit={edit}>
      <input name="name" />
      <input name="school" />
      <input name="subject" />
      <button type="submit">Save</button>
    </form>
    </>
  );
};

export default Edit;
