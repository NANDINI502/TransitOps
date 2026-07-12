export default function PageHeader({ title, description, actions, filters }) {
  return (
    <div className="control-panel">
      <div className="control-panel__top">
        <div className="control-panel__titles">
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className="control-panel__actions">{actions}</div> : null}
      </div>
      {filters ? <div className="control-panel__filters">{filters}</div> : null}
    </div>
  );
}
