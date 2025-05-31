import { Lesson } from '../../types/Lesson';
import LessonTable from './LessonTable';

const MainContent: React.FC<{ lessons: Lesson[] }> = ({ lessons }) => (
  <section className="w-full max-w-5xl mx-auto">
    <LessonTable lessons={lessons} />
  </section>
);

export default MainContent;
