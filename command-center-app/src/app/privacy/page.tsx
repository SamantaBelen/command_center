export const metadata = {
  title: "Privacidad · Command Center",
  description: "Política de privacidad de Command Center",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "48px 24px 80px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#2f2a27",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ color: "#6e2b3a" }}>Política de privacidad</h1>
      <p>
        <em>Command Center</em> es una aplicación personal de productividad de uso
        privado para su propietaria. Esta página describe cómo se tratan los datos.
      </p>

      <h2 style={{ color: "#6e2b3a", fontSize: 20 }}>Qué datos se usan</h2>
      <ul>
        <li>
          <strong>Google Calendar (solo lectura):</strong> con tu permiso, la app
          lee los eventos de tu calendario para <em>mostrarlos</em> junto a tus
          tareas en las vistas de Día y Semana. No crea, edita ni elimina eventos.
        </li>
        <li>
          <strong>Notion:</strong> la app lee y actualiza tus propias tareas y
          hábitos en tu espacio de Notion.
        </li>
      </ul>

      <h2 style={{ color: "#6e2b3a", fontSize: 20 }}>Cómo se almacenan</h2>
      <p>
        La app no guarda tus eventos de calendario en ninguna base de datos propia:
        los obtiene en el momento para mostrarlos y no los conserva. Las credenciales
        de acceso (tokens) se guardan únicamente como variables de entorno del
        servidor y nunca se exponen al navegador ni a terceros.
      </p>

      <h2 style={{ color: "#6e2b3a", fontSize: 20 }}>Con quién se comparten</h2>
      <p>
        Con nadie. Los datos no se venden ni se comparten con terceros. La app es de
        uso personal y solo es accesible mediante contraseña.
      </p>

      <h2 style={{ color: "#6e2b3a", fontSize: 20 }}>Revocar el acceso</h2>
      <p>
        Puedes revocar el acceso de la app a tu Google Calendar en cualquier momento
        desde{" "}
        <a
          href="https://myaccount.google.com/permissions"
          style={{ color: "#6e2b3a" }}
        >
          la configuración de tu cuenta de Google
        </a>
        .
      </p>

      <h2 style={{ color: "#6e2b3a", fontSize: 20 }}>Contacto</h2>
      <p>Para cualquier duda: sambelr11@gmail.com</p>
    </main>
  );
}
