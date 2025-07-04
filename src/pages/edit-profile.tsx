// src/pages/edit-profile.tsx
import { useCallback } from "react";
import { useApi } from "../services/api";

const Edit = () => {
  const api = useApi();
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
      const response = await api.post("/edit-profile", data);
      console.log(response);
    },
    [api],
  );
  return (
    <form onSubmit={edit}>
      <input name="name" />
      <input name="school" />
      <input name="subject" />
      <button type="submit">Save</button>
    </form>
  );
};

export default Edit;
