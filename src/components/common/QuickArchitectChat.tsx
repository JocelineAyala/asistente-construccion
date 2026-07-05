import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Cpu,
  Send,
  Sparkles,
  User,
} from 'lucide-react';
import { Card } from '../ui/Card';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export function QuickArchitectChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        '¡Hola! Soy tu asistente rápido de arquitectura y construcción. ¿Tienes alguna pregunta sobre materiales, ventilación, temperatura, albañilería o diseño? Pregúntame lo que necesites.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isKeySaved, setIsKeySaved] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('buildassist:openai-api-key') || '';
    setApiKey(savedKey);
    setTempKey(savedKey);
  }, []);

  // Auto-scroll only inside the chat panel, not the whole page
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('buildassist:openai-api-key', tempKey.trim());
    setApiKey(tempKey.trim());
    setIsKeySaved(true);
    setTimeout(() => setIsKeySaved(false), 2000);
    setShowSettings(false);
  };

  const handleClearKey = () => {
    localStorage.removeItem('buildassist:openai-api-key');
    setApiKey('');
    setTempKey('');
  };

  const getSimulatedResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('ventil') || lowerQuery.includes('aire') || lowerQuery.includes('viento')) {
      return `Para mejorar la **ventilación** en una habitación, te recomiendo implementar la **ventilación cruzada**. Esto consiste en colocar aberturas en paredes opuestas o adyacentes para permitir el flujo natural del aire.\n\n**Recomendaciones clave:**\n1. El área de las ventanas debe ser al menos el **10% al 15%** del área total del piso.\n2. La dirección del viento predominante en tu zona debe guiar la ubicación de las entradas de aire.\n3. Instalar extractores mecánicos o rejillas de transferencia si no tienes muros hacia el exterior.`;
    }

    if (
      lowerQuery.includes('temperatura') ||
      lowerQuery.includes('calor') ||
      lowerQuery.includes('frio') ||
      lowerQuery.includes('aisla') ||
      lowerQuery.includes('techo')
    ) {
      return `Para controlar la **temperatura** interior y reducir el uso de aire acondicionado/calefacción, el aislamiento térmico es tu mejor opción:\n\n- **Techo**: El 30% del calor ingresa por aquí. Recomiendo impermeabilizar con pintura elastomérica blanca reflectante en el exterior o instalar planchas de poliestireno extruido (XPS) de 2" bajo el techo.\n- **Ventanas**: Utilizar doble acristalamiento (DVH) o colocar películas protectoras de control solar para rechazar la radiación UV directa.\n- **Paredes**: Si reciben sol directo en la tarde, considera un trasdosado interior de paneles de yeso con aislamiento de lana mineral.`;
    }

    if (
      lowerQuery.includes('pared') ||
      lowerQuery.includes('hoyo') ||
      lowerQuery.includes('hueco') ||
      lowerQuery.includes('agujero') ||
      lowerQuery.includes('yeso') ||
      lowerQuery.includes('reparar') ||
      lowerQuery.includes('imperfec')
    ) {
      return `Para **reparar un hoyo en la pared** (yeso/drywall o revoque tradicional) sigue este proceso profesional:\n\n1. **Limpieza**: Retira todo el material suelto, pintura descascarada y polvo.\n2. **Relleno**: Para agujeros pequeños usa masilla acrílica lista para usar. Para hoyos de más de 5 cm en drywall, necesitarás una malla autoadhesiva de fibra de vidrio y luego aplicar la masilla en capas delgadas.\n3. **Secado e Imprimación**: Deja secar por completo (2-6 horas dependiendo del espesor), lija suavemente con grano 220 para emparejar y aplica sellador de paredes antes de pintar para un acabado uniforme.`;
    }

    if (
      lowerQuery.includes('cemento') ||
      lowerQuery.includes('mezcla') ||
      lowerQuery.includes('concreto') ||
      lowerQuery.includes('arena') ||
      lowerQuery.includes('mortero')
    ) {
      return `Las dosificaciones básicas para mezclas comunes son las siguientes:\n\n- **Mortero de Asentado de Ladrillos/Bloques**: Proporción **1:5** (1 medida de cemento por 5 de arena mediana), ideal para una buena adherencia y trabajabilidad.\n- **Concreto para Pisos/Contrapisos**: Proporción **1:3:3** (1 de cemento, 3 de arena, 3 de grava) más agua.\n- **Concreto Estructural (Vigas, Columnas)**: Proporción **1:2:3** (1 de cemento, 2 de arena, 3 de piedra chancada/grava). Esta mezcla garantiza aproximadamente 210 kg/cm² (3000 PSI) si se cura de forma adecuada durante 7 días mojando la superficie.`;
    }

    if (
      lowerQuery.includes('columna') ||
      lowerQuery.includes('viga') ||
      lowerQuery.includes('sismo') ||
      lowerQuery.includes('estructura') ||
      lowerQuery.includes('cargar')
    ) {
      return `**¡Advertencia estructural!** Las vigas, columnas y muros de carga son esenciales para la estabilidad de tu hogar:\n\n- **Regla de oro**: Nunca piques o elimines partes de una columna o viga existente para pasar tuberías, esto debilita gravemente la estructura.\n- **Muros portantes**: En viviendas de mampostería confinada, no realices ranuras horizontales largas en los ladrillos; esto puede comprometer el soporte ante un sismo.\n- Consulta siempre con un calculista o ingeniero civil antes de demoler un muro si no estás seguro de si es de carga.`;
    }

    return `Es una consulta muy interesante. Desde el punto de vista arquitectónico y constructivo:\n\n1. **Distribución**: Optimiza siempre la entrada de luz natural situando las zonas sociales (sala, comedor) hacia donde haya mayor iluminación solar diurna.\n2. **Materiales**: Elige materiales locales. Tienen un menor costo logístico y están adaptados al clima de tu región.\n3. **Normas**: Respeta siempre las alturas mínimas requeridas para ventilación y habitabilidad en tu área (usualmente de 2.40m a 2.60m).\n\n¿Deseas profundizar en algún detalle específico de tu obra?`;
  };

  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  const isEnvKeyConfigured = envKey && envKey !== 'tu_api_key_aqui';
  const activeKey = isEnvKeyConfigured ? envKey : apiKey;

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    if (!activeKey) {
      // Local Simulation
      setTimeout(() => {
        const reply = getSimulatedResponse(userQuery);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
          },
        ]);
        setIsLoading(false);
      }, 1200);
    } else {
      // Real API Call to OpenAI
      try {
        // We prepare the messages context (system message + last 5 messages to avoid token bloat)
        const recentMessages = messages.slice(-5).map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

        recentMessages.push({
          role: 'user',
          content: userQuery,
        });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'Eres un asistente de arquitectura, diseño de interiores y construcción de hogares experto. Respondes en español de forma profesional, clara, directa y estructurada con consejos prácticos aplicables a autoconstrucción o remodelación.',
              },
              ...recentMessages,
            ],
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || 'Error en la respuesta de OpenAI');
        }

        const data = await response.json();
        const reply = data.choices[0]?.message?.content || 'No se obtuvo respuesta del modelo.';

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: reply,
            timestamp: new Date(),
          },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `❌ **Error al conectar con OpenAI:** ${err.message || 'Error de red.'}\n\nPor favor, verifica que tu API Key sea correcta o sigue usando el chat en modo simulador limpiando la clave en el panel de configuración ⚙️.`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <Card className="chat-card">
      <div className="chat-header">
        <div className="chat-header-title">
          <Sparkles className="chat-sparkles-icon" size={16} />
          <div>
            <h3>Consultas Rápidas de IA</h3>
            <span className="chat-subtitle">Asesoría de arquitectura y construcción al instante</span>
          </div>
        </div>

        <div className="chat-header-actions">
          {isEnvKeyConfigured ? (
            <span className="api-badge api-badge-connected" title="Conectado vía .env (VITE_OPENAI_API_KEY)">
              <Cpu size={12} />
              OpenAI (.env)
            </span>
          ) : apiKey ? (
            <span className="api-badge api-badge-connected" title="Conectado a OpenAI GPT">
              <Cpu size={12} />
              OpenAI (local)
            </span>
          ) : (
            <span className="api-badge api-badge-simulated" title="Simulando respuestas locales">
              Simulador
            </span>
          )}
        </div>
      </div>

      {!activeKey ? (
        <div className="chat-info-banner">
          <AlertCircle size={14} className="chat-info-banner-icon" />
          <p>
            Estás usando el <strong>Modo Simulador</strong>. Haz preguntas para recibir respuestas preconfiguradas
            o configura tu OpenAI API Key en el archivo <code>.env</code> en la raíz del proyecto.
          </p>
        </div>
      ) : null}

      <div className="chat-messages" ref={messagesContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${
              message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
            }`}
          >
            <div className="chat-message-avatar">
              {message.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className="chat-message-content">
              <div
                style={{
                  whiteSpace: 'pre-line',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                }}
              >
                {message.content}
              </div>
              <span className="chat-message-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading ? (
          <div className="chat-message chat-message-assistant chat-message-loading">
            <div className="chat-message-avatar">
              <Bot size={14} />
            </div>
            <div className="chat-message-content">
              <div className="chat-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="chat-input-form">
        <input
          type="text"
          className="chat-input-field"
          placeholder="Pregunta sobre materiales, muros, vigas..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSend(e);
            }
          }}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleSend}
          className="chat-send-btn"
          disabled={!input.trim() || isLoading}
          aria-label="Enviar pregunta"
        >
          <Send size={16} />
        </button>
      </div>
    </Card>
  );
}
