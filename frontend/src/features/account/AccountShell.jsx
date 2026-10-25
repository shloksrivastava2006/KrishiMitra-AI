const Shell = ({ title, children }) => (
  <div className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="text-3xl font-bold">{title}</h1>
    <div className="mt-6">{children}</div>
  </div>
);

export default Shell;
