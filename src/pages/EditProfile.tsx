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
        const user = await api.get("/api/profile");
        setProfileUrl(user.avatar);
        setRole(user.role);
      } catch {
        void 0;
      }
    };
    fetchProfile();
  }, [api]);

  const edit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name");
<<<<<<< HEAD
      const roleLower = String(role || "").toLowerCase();
      const school = roleLower === "teacher" ? formData.get("school") : "blank";
      const subject = roleLower === "teacher" ? formData.get("subject") : "blank";
      const bio = roleLower === "teacher" ? formData.get("bio") : "blank";
      const grade = roleLower === "student" ? formData.get("grade") : "blank";
      const data = { role, name, school, subject, bio, grade };
      await api.post("/api/edit-profile", data);
||||||| parent of 77dba5d (Update EditProfile.tsx)
      const school = role === "teacher" ? formData.get("school") : "blank";
      const subject = role === "teacher" ? formData.get("subject") : "blank";
      const bio = role === "teacher" ? formData.get("bio") : "blank";
      const grade = role === "student" ? formData.get("grade") : "blank";
      const data = {
        role: role,
        name: name,
        school: school,
        subject: subject,
        bio: bio
      };
      const response = await api.post("/api/edit-profile", data);
      console.log(response);
=======
      const school = role === "teacher" ? formData.get("school") : "blank";
      const subject = role === "teacher" ? formData.get("subject") : "blank";
      const bio = role === "teacher" ? formData.get("bio") : "blank";
      const grade = role === "student" ? formData.get("grade") : "blank";
      const data = {
        role: role,
        name: name,
        school: school,
        subject: subject,
        bio: bio,
        grade: grade
      };
      const response = await api.post("/api/edit-profile", data);
      console.log(response);
>>>>>>> 77dba5d (Update EditProfile.tsx)
    },
    [api, role],
  );

  return (
    <>
      <img src={profileUrl} alt="profile picture" />
      <form onSubmit={edit}>
        <input name="name" placeholder="Name" />
        {String(role || "").toLowerCase() === "teacher" && (
          <>
            <input name="school" placeholder="School" />
            <input name="subject" placeholder="Subject" />
            <input name="bio" placeholder="Bio" />
          </>
        )}
        {String(role || "").toLowerCase() === "student" && <input name="grade" placeholder="Grade" />}
        <button type="submit">Save</button>
      </form>
    </>
  );
};

export default Edit;
