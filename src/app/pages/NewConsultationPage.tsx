import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Construction,
  MoreHorizontal,
  PencilRuler,
  Sparkles,
} from 'lucide-react';
import houseIllustration from '../../assets/illustrations/house.svg';
import { PageTitle } from '../../components/common/PageTitle';
import { UploadCard } from '../../components/common/UploadCard';
import { mapMaterialsToVidriProducts } from '../../constants/storeProducts';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { fileToDataUrl } from '../../utils/openai';
import { clearFloorPlanSession } from '../../utils/analyzeFloorPlan';

const PENDING_PLAN_SKETCH_KEY = 'buildassist:pending-plan-sketch';
const LAST_PROJECT_KEY = 'buildassist:last-project';
const LAST_RESULT_KEY = 'buildassist:last-result';

const CONSULTATION_OPTIONS = [
  {
    icon: PencilRuler,
    label: 'Dibujar plano',
    placeholder: 'Describe el tipo de edificación o estructura que quieres planificar.',
    tone: 'blue',
  },
  {
    icon: Construction,
    label: 'Reparar imperfecciones pequeñas',
    placeholder:
      'Describe las imperfecciones pequeñas que deseas reparar en la pared (ej. grietas, fisuras, agujeros de clavos).',
    tone: 'red',
  },
  {
    icon: MoreHorizontal,
    label: 'Otro',
    placeholder: 'Describe que quieres mejorar, reparar o remodelar.',
    tone: 'yellow',
  },
];

export function NewConsultationPage() {
  const navigate = useNavigate();

  // Core states
  const [imagePreview, setImagePreview] = useState<string>();
  const [imageFile, setImageFile] = useState<File>();
  const [consultationType, setConsultationType] = useState(CONSULTATION_OPTIONS[0].label);
  const [description, setDescription] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [planSketchPreview, setPlanSketchPreview] = useState<string>();
  const [planSketchFile, setPlanSketchFile] = useState<File>();

  // Wizard specific states for small imperfections
  const [wizardStep, setWizardStep] = useState(1);
  const [damageType, setDamageType] = useState('Pared con hoyo');
  const [damageMaterial, setDamageMaterial] = useState('Concreto/Cemento');
  const [damageSize, setDamageSize] = useState('');
  const [damageBudget, setDamageBudget] = useState('50');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectedOption = CONSULTATION_OPTIONS.find((option) => option.label === consultationType);

  useEffect(() => {
    localStorage.removeItem(LAST_RESULT_KEY);
    localStorage.removeItem(LAST_PROJECT_KEY);
    clearFloorPlanSession();
  }, []);

  const revokePreviewUrl = (preview?: string) => {
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    revokePreviewUrl(imagePreview);
    localStorage.removeItem(LAST_RESULT_KEY);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handlePlanSketchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    revokePreviewUrl(planSketchPreview);
    clearFloorPlanSession();
    setPlanSketchFile(file);
    setPlanSketchPreview(URL.createObjectURL(file));
  };

  const handleGoToPlanMapping = async () => {
    if (!planSketchFile) return;

    const dataUrl = await fileToDataUrl(planSketchFile);
    clearFloorPlanSession();
    sessionStorage.setItem(PENDING_PLAN_SKETCH_KEY, dataUrl);
    navigate('/usuario/dibujar-plano');
  };

  // Convert File to Base64 (ignoring standard header)
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const generateMockAnalysis = () => {
    const formattedMaterial = damageMaterial.toLowerCase();
    const formattedType = damageType.toLowerCase();

    let diagnostico = `Se detecta una imperfección catalogada como '${formattedType}' sobre una superficie de '${formattedMaterial}'. El daño reportado de dimensiones '${damageSize || 'no especificadas'}' requiere un proceso de limpieza de bordes y sellado adecuado.`;
    let materials = ['Masilla elástica', 'Lija fina (grano 180)', 'Espátula metálica'];
    let steps = [
      'Limpiar el área retirando restos sueltos o polvo.',
      'Aplicar el compuesto de relleno presionando para llenar todo el volumen.',
      'Dejar secar por unas horas y lijar suavemente.',
      'Limpiar el polvo resultante y dar un acabado final.',
    ];
    let videos = [
      {
        title: `Cómo reparar ${formattedType} en ${formattedMaterial}`,
        imageLabel: 'Tutorial',
      },
    ];

    if (damageType.includes('hoyo') || damageType.includes('agujero')) {
      diagnostico = `Se detecta una cavidad abierta en la superficie de ${formattedMaterial}. Es fundamental rellenarla con masilla acrílica de secado rápido y colocar un parche de refuerzo si la profundidad supera los 3 cm.`;
      materials = [
        `Pasta niveladora para ${damageMaterial}`,
        'Espátula de 4 pulgadas',
        'Lijas grano 150 y 220',
        'Sellador acrílico para muros',
      ];
      steps = [
        'Retirar toda la pintura suelta y limpiar el interior del hoyo con una brocha húmeda.',
        'Rellenar el hueco usando la pasta niveladora y la espátula en capas sucesivas de 1 cm máximo.',
        'Dejar secar por completo entre capa y capa (aprox. 2 horas).',
        'Lijar al ras de la pared usando lija grano 150 primero y luego grano 220.',
        'Aplicar una capa de sellador antes de pintar para evitar que absorba demasiada pintura.',
      ];
      videos = [
        {
          title: `Reparar agujero en pared de ${formattedMaterial} paso a paso`,
          imageLabel: 'YouTube',
        },
      ];
    } else if (damageType.includes('Piso')) {
      diagnostico = `Se identifica un agrietamiento o fractura en el piso de ${formattedMaterial}. Esto puede ser causado por flexión, cargas excesivas o impacto directo y requiere un mortero o resina de alta resistencia.`;
      materials = [
        'Mortero cementicio de alta resistencia',
        'Llana de goma o espátula ancha',
        'Limpiador ácido suave para juntas',
        'Sellador protector para pisos de concreto o cerámica',
      ];
      steps = [
        'Picar ligeramente los bordes de la grieta o rotura para remover concreto debilitado y ganar adherencia.',
        'Aspirar todo el polvo y humedecer ligeramente la superficie con agua limpia.',
        'Preparar el mortero de reparación y rellenar presionando con fuerza usando la llana.',
        'Nivelar el acabado al ras del piso circundante y dejar curar por 24 horas sin pisar.',
        'Aplicar el sellador protector para evitar futuras filtraciones o manchas.',
      ];
      videos = [
        { title: 'Cómo reparar concreto o cerámica rota en el piso', imageLabel: 'Video' },
      ];
    } else if (damageType.includes('Ventana') || damageType.includes('puerta')) {
      diagnostico = `Se observa una desalineación, descuadre o fisura en el marco de la ventana o puerta. Esto suele deberse a dilatación térmica de materiales o fallas en el anclaje inicial.`;
      materials = [
        'Nivel de burbuja',
        'Cuñas de madera o plástico',
        'Pistola de espuma de poliuretano expansiva',
        'Tornillos de anclaje de 3 pulgadas',
      ];
      steps = [
        'Revisar la plomada y nivel horizontal del marco con el nivel de burbuja.',
        'Retirar molduras o restos de espuma vieja alrededor del marco.',
        'Insertar cuñas de madera para ajustar y nivelar el marco al punto correcto.',
        'Fijar con los tornillos de anclaje a las jambas o muro de soporte.',
        'Rellenar el perímetro con espuma de poliuretano expansiva para sellar entrada de aire o agua.',
      ];
      videos = [
        { title: 'Cómo nivelar y ajustar una puerta o ventana torcida', imageLabel: 'Guía' },
      ];
    }

    return {
      diagnostico,
      materials,
      steps,
      videos,
    };
  };

  const handleAnalyzeImperfections = async () => {
    setIsAnalyzing(true);
    setSavedMessage('Procesando datos y analizando imagen...');

    const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
    const envKey = import.meta.env.VITE_OPENAI_API_KEY;
    const isEnvKeyConfigured = envKey && envKey !== 'tu_api_key_aqui';

    let resultData;

    if (n8nWebhookUrl && imageFile) {
      try {
        const base64Data = await fileToBase64(imageFile);
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consultationType,
            description: description || 'Ninguna',
            image: base64Data,
            roomDetails: null,
            damageType,
            damageMaterial,
            damageSize,
            damageBudget,
            savedAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Error en el Webhook de n8n (HTTP ${response.status})`);
        }

        resultData = await response.json();
      } catch (error: any) {
        console.error('Error con el Webhook de n8n:', error);
        setSavedMessage(`Fallo en n8n: ${error.message || 'Error de red.'}. Usando simulación...`);
        resultData = generateMockAnalysis();
      }
    } else if (isEnvKeyConfigured && imageFile) {
      try {
        const base64Data = await fileToBase64(imageFile);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${envKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  "Eres un asesor experto en arquitectura, albañilería y remodelaciones estructurales en construcción y edificación. Analizas imágenes reales de imperfecciones y debes escribir un diagnóstico sumamente detallado, técnico y profesional en base a los elementos visuales que observes en la foto (como formas, fisuras, colores, texturas y gravedad visible). El diagnóstico debe ser extenso (mínimo 3 párrafos separados por dos saltos de línea \\n\\n), explicando con precisión la causa técnica probable de la falla, evaluando la gravedad estructural y dando consejos de prevención. El diagnóstico DEBE empezar o contener una referencia explícita al presupuesto disponible del usuario (ej: 'Con tu presupuesto de $X USD, la estrategia adecuada consiste en...'), evaluando qué calidad de materiales es viable conseguir con ese monto y cómo se adapta el plan de reparación. Debes describir detalles visuales reales de la imagen para demostrar que estás inspeccionando el archivo subido en lugar de dar una respuesta genérica. Además, debes tener muy en cuenta el presupuesto estimado brindado por el usuario al recomendar materiales y pasos: si es un presupuesto bajo, prioriza materiales accesibles y soluciones económicas o caseras (DIY); si es un presupuesto alto o no está especificado, recomienda marcas líderes, soluciones premium y de mayor durabilidad. Responde estrictamente con un formato JSON válido y estructurado, sin bloques de código de tipo markdown, que contenga las propiedades: 'diagnostico' (string extenso con saltos de línea para separar párrafos), 'materials' (array de strings con materiales específicos recomendados), 'steps' (array de strings con pasos detallados y ordenados para repararlo) y 'videos' (array de objetos {title, imageLabel} con títulos sugeridos de videos instructivos de YouTube).",
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `El usuario reporta la siguiente imperfección:\n- Tipo de daño: ${damageType}\n- Material de la superficie: ${damageMaterial}\n- Medidas o detalles: ${damageSize}\n- Presupuesto estimado: $${damageBudget || 'No especificado'} USD\n- Descripción adicional: ${description || 'Ninguna'}`,
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || 'Error en la respuesta de OpenAI');
        }

        const data = await response.json();
        const contentText = data.choices[0]?.message?.content || '{}';
        resultData = JSON.parse(contentText);
      } catch (error: any) {
        console.error('Error con OpenAI Vision API:', error);
        setSavedMessage(`Fallo en OpenAI: ${error.message || 'Error de red.'}. Usando simulación...`);
        resultData = generateMockAnalysis();
      }
    } else {
      // Simulation mode
      await new Promise((resolve) => setTimeout(resolve, 1500));
      resultData = generateMockAnalysis();
    }

    // Map materials to real Ferretería Vidrí products matching the budget
    if (resultData && resultData.materials) {
      let activeCatalog = undefined;
      try {
        const catalogRes = await fetch('/materiales_scraped.json');
        if (catalogRes.ok) {
          activeCatalog = await catalogRes.json();
        }
      } catch (e) {
        console.log('No custom scraped catalog found, using default catalog.');
      }

      resultData.materials = mapMaterialsToVidriProducts(
        resultData.materials,
        Number(damageBudget) || 50,
        activeCatalog
      );
    }

    // Save result to localStorage
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(resultData));

    const previewForStorage = imageFile ? await fileToDataUrl(imageFile) : imagePreview;

    // Save project overview in localStorage under 'buildassist:last-project'
    const project = {
      consultationType,
      description,
      imagePreview: previewForStorage,
      damageBudget,
      roomDetails: null,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(project));

    setIsAnalyzing(false);
    navigate('/usuario/analizando');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const previewForStorage = imageFile ? await fileToDataUrl(imageFile) : imagePreview;
    const project = {
      consultationType,
      description,
      imagePreview: previewForStorage,
      roomDetails: null,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(LAST_PROJECT_KEY, JSON.stringify(project));
    // Clear previous OpenAI result since this is a normal consultation
    localStorage.removeItem(LAST_RESULT_KEY);
    setSavedMessage('Proyecto guardado en este dispositivo.');
    navigate('/usuario/analizando');
  };

  return (
    <div className="page-grid sv-page-panel sv-consultation-page">
      <section className="sv-hero">
        <PageTitle eyebrow="Nueva consulta" title="Nuevo proyecto de construcción">
          <span className="sv-title-accent" aria-hidden="true" />
          <p>
            Selecciona la mejora, ajusta los datos del espacio y recibe orientación
            práctica con el asistente de IA.
          </p>
        </PageTitle>
        <img className="sv-hero-house" src={houseIllustration} alt="" aria-hidden="true" />
      </section>

      <Card className="sv-section-card">
        <div className="sv-section-heading">
          <span className="eyebrow">Detalles del plan</span>
          <h2>Mejora del espacio</h2>
          <p>Elige el tipo de consulta que mejor describe lo que necesitas resolver.</p>
        </div>

        <fieldset className="consultation-options">
          <legend>Selecciona que necesitas</legend>
          <div className="option-grid">
            {CONSULTATION_OPTIONS.map(({ icon: Icon, label, tone }) => (
              <label
                key={label}
                className={`consultation-option tone-${tone}${
                  consultationType === label ? ' consultation-option-selected' : ''
                }`}
              >
                <input
                  type="radio"
                  name="consultation-type"
                  value={label}
                  checked={consultationType === label}
                  onChange={(event) => {
                    setConsultationType(event.target.value);
                    setWizardStep(1);
                    revokePreviewUrl(imagePreview);
                    revokePreviewUrl(planSketchPreview);
                    setImagePreview(undefined);
                    setImageFile(undefined);
                    setPlanSketchPreview(undefined);
                    setPlanSketchFile(undefined);
                  }}
                />
                <span className="consultation-option-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {consultationType === 'Dibujar plano' ? (
        <Card className="sv-section-card">
          <div className="sv-section-heading">
            <span className="eyebrow">Dibujar plano</span>
            <h2>Continúa al mapeo del boceto</h2>
            <p>
              Sube tu dibujo aquí y pasa a la pantalla dedicada donde la IA generará pasos de
              levantamiento, especificaciones y un modelo 3D de tu plano.
            </p>
          </div>

          <UploadCard imagePreview={planSketchPreview} onImageChange={handlePlanSketchChange} />

          <div className="sv-form-actions sv-form-actions-stack">
            <Button
              type="button"
              onClick={handleGoToPlanMapping}
              disabled={!planSketchFile}
              fullWidth
            >
              <Sparkles size={16} /> Ir al mapeo del plano
            </Button>
          </div>
        </Card>
      ) : consultationType === 'Reparar imperfecciones pequeñas' ? (
        <div className="wizard-container page-grid">
          {wizardStep === 1 ? (
            <Card className="sv-section-card">
              <div className="sv-section-heading">
                <span className="sv-step-badge">Paso 1 de 2</span>
                <h2>Sube la foto del daño</h2>
                <p>
                  Sube una foto clara del daño en la pared, piso o ventana para que la IA
                  realice la inspección.
                </p>
              </div>

              <UploadCard imagePreview={imagePreview} onImageChange={handleImageChange} />

              <div className="sv-form-actions sv-form-actions-stack">
                {!imagePreview ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
                      setImagePreview(mockBase64);
                      const blob = new Blob([new Uint8Array(26)], { type: 'image/png' });
                      const dummyFile = new File([blob], 'demo-daño.png', { type: 'image/png' });
                      setImageFile(dummyFile);
                    }}
                    fullWidth
                  >
                    Usar imagen de prueba (Demostración)
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!imagePreview}
                  fullWidth
                >
                  Siguiente paso <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="sv-section-card">
              <div className="sv-section-heading">
                <span className="sv-step-badge">Paso 2 de 2</span>
                <h2>Cuéntanos más sobre el daño</h2>
                <p>
                  Responde estas breves preguntas para precisar el diagnóstico e inyectar
                  datos a la IA.
                </p>
              </div>

              <div className="stack sv-form-stack">
                <div className="input-field">
                  <label>¿Qué tipo de daño es?</label>
                  <select
                    className="sv-select"
                    value={damageType}
                    onChange={(e) => setDamageType(e.target.value)}
                  >
                    <option value="Pared con hoyo">Pared con hoyo / cavidad</option>
                    <option value="Piso roto">Piso roto / loseta suelta</option>
                    <option value="Ventana/Puerta torcida">Ventana / Puerta torcida</option>
                    <option value="Grietas en techo">Grietas en techo</option>
                    <option value="Otro">Otro tipo de daño</option>
                  </select>
                </div>

                <div className="input-field">
                  <label>¿De qué material es la superficie?</label>
                  <select
                    className="sv-select"
                    value={damageMaterial}
                    onChange={(e) => setDamageMaterial(e.target.value)}
                  >
                    <option value="Yeso/Pladur">Yeso / Pladur / Drywall</option>
                    <option value="Concreto/Cemento">Concreto / Cemento / Mezcla</option>
                    <option value="Ladrillo/Bloque">Ladrillo / Bloque de arcilla</option>
                    <option value="Madera">Madera</option>
                    <option value="Cerámica/Azulejo">Cerámica / Azulejo</option>
                  </select>
                </div>

                <Input
                  label="¿Cuáles son las medidas aproximadas del daño?"
                  placeholder="Ej: hoyo de 10x10 cm, fisura de 50 cm..."
                  value={damageSize}
                  onChange={(e) => setDamageSize(e.target.value)}
                />

                <Input
                  label="¿Cuál es tu presupuesto estimado (USD)?"
                  placeholder="Ej: 30, 50, 100..."
                  value={damageBudget}
                  onChange={(e) => setDamageBudget(e.target.value)}
                  type="number"
                />

                <div className="input-field">
                  <label htmlFor="problem-description">Descripción adicional (opcional)</label>
                  <textarea
                    id="problem-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Agrega cualquier detalle extra relevante."
                    rows={4}
                  />
                </div>
              </div>

              <div className="sv-form-actions sv-form-actions-split">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setWizardStep(1)}
                  disabled={isAnalyzing}
                >
                  <ArrowLeft size={16} /> Volver
                </Button>

                <Button type="button" onClick={handleAnalyzeImperfections} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>Analizando...</>
                  ) : (
                    <>
                      <Sparkles size={16} /> Analizar con IA
                    </>
                  )}
                </Button>
              </div>
              {savedMessage ? (
                <p className="save-message sv-save-message">{savedMessage}</p>
              ) : null}
            </Card>
          )}
        </div>
      ) : (
        <form className="page-grid sv-consultation-form" onSubmit={handleSubmit}>
          <UploadCard imagePreview={imagePreview} onImageChange={handleImageChange} />

          <Card className="sv-section-card">
            <div className="sv-section-heading">
              <span className="eyebrow">Descripcion</span>
              <h2>Detalle de la mejora</h2>
            </div>
            <label className="textarea-label" htmlFor="problem-description">
              Describe que deseas mejorar o remodelar
            </label>
            <textarea
              id="problem-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={selectedOption?.placeholder}
              rows={6}
            />
          </Card>

          <div className="sv-form-actions">
            <Button type="submit" fullWidth>
              Guardar proyecto
            </Button>
            {savedMessage ? <p className="save-message">{savedMessage}</p> : null}
          </div>
        </form>
      )}
    </div>
  );
}
