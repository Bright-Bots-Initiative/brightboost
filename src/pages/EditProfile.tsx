// src/pages/edit-profile.tsx
import { useState, useEffect, useCallback } from "react";
import { useApi } from "../services/api";

const Edit = () => {
  const api = useApi();
  
  const [profileUrl, setProfileUrl] = useState("https://api.dicebear.com/7.x/identicon/svg?seed=default");
  const [role, setRole] = useState("blank");
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const user_data = await api.get("/api/profile");
        const parsed = JSON.parse(user_data);
        setProfileUrl(parsed.avatar);
        setRole(parsed.role)
      } catch (err: any) {
        console.log("Failed to get image/role");
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
      const bio = role === "teacher" ? formData.get("bio") : "blank";
      const data = {
        role: role,
        name: name,
        school: school,
        subject: subject,
        bio: bio
      };
      const response = await api.post("/api/edit-profile", data);
      console.log(response);
    },
    [api, role],
  );
    
  return (
    <>
    <img 
      src = {profileUrl}
      alt="profile picture"
      />
    <form onSubmit={edit}>
      <input name="name" placeholder="Name" />
      <input name="school" placeholder="School" />
      <input name="subject" placeholder="Subject" />
      {role === "teacher" && (
        <input name="bio" placeholder="Bio" />
      )}
      <button type="submit">Save</button>
    </form>
    </>
  );
};

export default Edit;
