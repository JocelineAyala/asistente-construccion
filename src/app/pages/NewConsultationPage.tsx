import { ChangeEvent, FormEvent, useState } from 'react';
import { Construction, MoreHorizontal, ThermometerSun, Wind } from 'lucide-react';
import { PageTitle } from '../../components/common/PageTitle';
import { RoomModel3D } from '../../components/common/RoomModel3D';
import { UploadCard } from '../../components/common/UploadCard';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

const CONSULTATION_OPTIONS = [
  {
    icon: Wind,
    label: 'Mejorar ventilacion',
    placeholder: 'Quiero que circule mejor el aire en esta habitacion.',
  },
  {
    icon: ThermometerSun,
    label: 'Mejorar temperatura',
    placeholder: 'Quiero reducir el calor de esta habitacion durante el dia.',
  },
  {
    icon: Construction,
    label: 'Reparar hoyo pared',
    placeholder: 'Necesito reparar un hoyo en la pared y dejarlo listo para pintar.',
  },
  {
    icon: MoreHorizontal,
    label: 'Otro',
    placeholder: 'Describe que quieres mejorar, reparar o remodelar.',
  },
];

const ROOM_DETAIL_OPTIONS = ['Mejorar ventilacion', 'Mejorar temperatura'];

export function NewConsultationPage() {
  const [imagePreview, setImagePreview] = useState<string>();
  const [consultationType, setConsultationType] = useState(CONSULTATION_OPTIONS[0].label);
  const [description, setDescription] = useState('');
  const [hasWindows, setHasWindows] = useState('Si');
  const [roomDimensions, setRoomDimensions] = useState({
    height: '2.5',
    length: '4',
    width: '3',
  });
  const [windowCount, setWindowCount] = useState('2');
  const [windowLocation, setWindowLocation] = useState('');
  const [zone, setZone] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const selectedOption = CONSULTATION_OPTIONS.find((option) => option.label === consultationType);
  const needsRoomDetails = ROOM_DETAIL_OPTIONS.includes(consultationType);
  const roomModelMode = consultationType === 'Mejorar temperatura' ? 'temperature' : 'ventilation';

  const updateDimension = (dimension: keyof typeof roomDimensions, value: string) => {
    setRoomDimensions((currentDimensions) => ({
      ...currentDimensions,
      [dimension]: value,
    }));
  };

  const toDimensionNumber = (value: string) => {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const project = {
      consultationType,
      description,
      imagePreview,
      roomDetails: needsRoomDetails
        ? {
            dimensions: roomDimensions,
            hasWindows,
            windowCount: hasWindows === 'Si' ? windowCount : '0',
            windowLocation: hasWindows === 'Si' ? windowLocation : '',
            zone,
          }
        : null,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem('buildassist:last-project', JSON.stringify(project));
    setSavedMessage('Proyecto guardado en este dispositivo.');
  };

  return (
    <form className="page-grid" onSubmit={handleSubmit}>
      <PageTitle eyebrow="Nueva consulta" title="Nuevo Proyecto de Hogar">
        <p>Selecciona la mejora, ajusta los datos y guarda el proyecto en el prototipo.</p>
      </PageTitle>

      <Card className="plan-card">
        <div>
          <span className="eyebrow">Detalles del Plan</span>
          <h2>Mejora del espacio</h2>
        </div>

        <fieldset className="consultation-options">
          <legend>Selecciona que necesitas</legend>
          <div className="option-grid">
            {CONSULTATION_OPTIONS.map(({ icon: Icon, label }) => (
              <label
                key={label}
                className={
                  consultationType === label
                    ? 'consultation-option consultation-option-selected'
                    : 'consultation-option'
                }
              >
                <input
                  type="radio"
                  name="consultation-type"
                  value={label}
                  checked={consultationType === label}
                  onChange={(event) => setConsultationType(event.target.value)}
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

      {needsRoomDetails ? (
        <>
          <section className="room-model-section">
            <div className="room-model-heading">
              <span className="eyebrow">Modelo 3D</span>
              <h2>Cuarto en vivo</h2>
            </div>
            <RoomModel3D
              height={toDimensionNumber(roomDimensions.height)}
              length={toDimensionNumber(roomDimensions.length)}
              mode={roomModelMode}
              showWindows={hasWindows === 'Si'}
              width={toDimensionNumber(roomDimensions.width)}
            />
          </section>

          <Card className="room-details-card">
            <div>
              <span className="eyebrow">Informacion del cuarto</span>
              <h2>Medidas y condiciones</h2>
            </div>

            <div className="room-measure-grid" aria-label="Medidas aproximadas del cuarto">
              <Input
                label="Largo aprox."
                type="number"
                min="0.1"
                step="0.1"
                value={roomDimensions.length}
                onChange={(event) => updateDimension('length', event.target.value)}
              />
              <Input
                label="Ancho aprox."
                type="number"
                min="0.1"
                step="0.1"
                value={roomDimensions.width}
                onChange={(event) => updateDimension('width', event.target.value)}
              />
              <Input
                label="Alto aprox."
                type="number"
                min="0.1"
                step="0.1"
                value={roomDimensions.height}
                onChange={(event) => updateDimension('height', event.target.value)}
              />
            </div>

            <fieldset className="window-options">
              <legend>Hay ventanas?</legend>
              <div className="binary-options">
                {['Si', 'No'].map((option) => (
                  <label
                    key={option}
                    className={
                      hasWindows === option
                        ? 'binary-option binary-option-selected'
                        : 'binary-option'
                    }
                  >
                    <input
                      type="radio"
                      name="has-windows"
                      value={option}
                      checked={hasWindows === option}
                      onChange={(event) => setHasWindows(event.target.value)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {hasWindows === 'Si' ? (
              <div className="room-measure-grid">
                <Input
                  label="Cantidad de ventanas"
                  type="number"
                  min="1"
                  step="1"
                  value={windowCount}
                  onChange={(event) => setWindowCount(event.target.value)}
                />
                <Input
                  label="Ubicacion de ventanas"
                  placeholder="Ej. pared norte"
                  value={windowLocation}
                  onChange={(event) => setWindowLocation(event.target.value)}
                />
              </div>
            ) : null}

            <Input
              label="Zona donde esta ubicado"
              placeholder="Ej. San Salvador, zona urbana"
              value={zone}
              onChange={(event) => setZone(event.target.value)}
            />
          </Card>
        </>
      ) : (
        <UploadCard imagePreview={imagePreview} onImageChange={handleImageChange} />
      )}

      <Card className="plan-card">
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

      <div className="form-actions">
        <Button type="submit" fullWidth>
          Guardar proyecto
        </Button>
        {savedMessage ? <p className="save-message">{savedMessage}</p> : null}
      </div>
    </form>
  );
}
