import "./style.css";

const GlobalLoader = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="loader">
        <div className="crystal"></div>
        <div className="crystal"></div>
        <div className="crystal"></div>
        <div className="crystal"></div>
        <div className="crystal"></div>
        <div className="crystal"></div>
      </div>
    </div>
  );
};

export default GlobalLoader;