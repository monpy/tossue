type CardProps = {
  title: string;
  children: React.ReactNode;
};

export function Card({ title, children }: CardProps) {
  return (
    <section className="demo-card">
      <h2 className="demo-card-title">{title}</h2>
      <div className="demo-card-content">{children}</div>
    </section>
  );
}
