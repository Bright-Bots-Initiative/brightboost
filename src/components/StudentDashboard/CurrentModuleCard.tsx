interface CurrentModule {
  title: string;
  status: string;
  dueDate: string;
  lessonId: string;
}

interface CurrentModuleCardProps {
  module: CurrentModule | null;
}

const CurrentModuleCard = ({ module }: CurrentModuleCardProps) => {
  if (!module) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
          Current Module
        </h2>
        <p className="text-sm text-gray-500">No current module assigned.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
        Current Module
      </h2>
      <p className="text-base font-medium text-gray-800">{module.title}</p>
      <p className="text-sm text-gray-600 mt-1">Status: {module.status}</p>
      <p className="text-sm text-gray-600">Due: {module.dueDate}</p>
    </div>
  );
};

export default CurrentModuleCard;
