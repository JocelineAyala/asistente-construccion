import { ChangeEvent, useState } from 'react';
import {
  ClipboardList,
  DoorOpen,
  FileDown,
  Layers3,
  Plus,
  RefreshCw,
  Ruler,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { UploadCard } from './UploadCard';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { FloorPlanAnalysis, DetectedWall } from '../../types/floorPlan';
import {
  WALL_ZONE_OPTIONS,
  normalizeWallDimensions,
  ensureWallMetadata,
} from '../../utils/planWallUtils';
import { applyWallLayout, getWallDisplayNumber } from '../../utils/wallRoomLayout';

type PlanMappingSpecsProps = {
  plan: FloorPlanAnalysis;
  onPlanChange: (plan: FloorPlanAnalysis) => void;
  onRecalculate: (file: File) => Promise<void>;
  isRecalculating: boolean;
  recalculateError?: string;
  onExportPdf: () => Promise<void>;
  isExportingPdf: boolean;
};

const STEP_ICONS = [Ruler, Square, DoorOpen, Layers3, ClipboardList, Sparkles];

function parseDimension(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function PlanMappingSpecs({
  plan,
  onPlanChange,
  onRecalculate,
  isRecalculating,
  recalculateError,
  onExportPdf,
  isExportingPdf,
}: PlanMappingSpecsProps) {
  const [refinedPreview, setRefinedPreview] = useState<string>();
  const [refinedFile, setRefinedFile] = useState<File>();

  const updatePlan = (partial: Partial<FloorPlanAnalysis>) => {
    onPlanChange({ ...plan, ...partial });
  };

  const updateGlobalDimension = (
    field: 'totalWidth' | 'totalLength' | 'ceilingHeight',
    value: string,
  ) => {
    const numericValue = parseDimension(value, plan[field]);

    if (field === 'ceilingHeight') {
      onPlanChange({
        ...plan,
        ceilingHeight: numericValue,
        rooms: plan.rooms.map((room) => ({ ...room, height: numericValue })),
      });
      return;
    }

    updatePlan({ [field]: numericValue });
  };

  const walls = plan.detectedWalls ?? [];

  const updateWalls = (nextWalls: DetectedWall[]) => {
    const nextPlan = {
      ...plan,
      detectedWalls: ensureWallMetadata(nextWalls, plan.rooms),
    };
    onPlanChange(applyWallLayout(nextPlan));
  };

  const updateWall = (wallId: string, partial: Partial<DetectedWall>) => {
    updateWalls(
      walls.map((wall) =>
        wall.id === wallId
          ? normalizeWallDimensions({ ...wall, ...partial })
          : wall,
      ),
    );
  };

  const updateWallDimension = (
    wallId: string,
    field: 'x' | 'y' | 'width' | 'length',
    value: string,
    fallback: number,
  ) => {
    updateWall(wallId, { [field]: parseDimension(value, fallback) });
  };

  const addWall = () => {
    const newWall: DetectedWall = {
      id: `wall-${crypto.randomUUID()}`,
      x: 0,
      y: 0,
      width: 3,
      length: 0.07,
      confidence: 1,
      orientation: 'horizontal',
      zone: 'other',
    };

    updateWalls([...walls, newWall]);
  };

  const removeWall = (wallId: string) => {
    updateWalls(walls.filter((wall) => wall.id !== wallId));
  };

  const handleRefinedSketchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRefinedFile(file);
    setRefinedPreview(URL.createObjectURL(file));
  };

  const handleRecalculateClick = async () => {
    if (!refinedFile) return;
    await onRecalculate(refinedFile);
    setRefinedFile(undefined);
    setRefinedPreview(undefined);
  };

  return (
    <div className="plan-mapping-specs">
      <Card className="sv-section-card plan-summary-card">
        <div className="sv-section-heading">
          <span className="eyebrow">Interpretación del boceto</span>
          <h2>Resumen del plano</h2>
          <p>Edita las medidas generales y el modelo 3D se actualizará al instante.</p>
        </div>
        <p className="plan-summary-text">{plan.summary}</p>

        <div className="plan-summary-metrics plan-summary-metrics-editable">
          <Input
            label="Ancho total (m)"
            type="number"
            min="1"
            step="0.1"
            value={plan.totalWidth}
            onChange={(event) => updateGlobalDimension('totalWidth', event.target.value)}
          />
          <Input
            label="Largo total (m)"
            type="number"
            min="1"
            step="0.1"
            value={plan.totalLength}
            onChange={(event) => updateGlobalDimension('totalLength', event.target.value)}
          />
          <Input
            label="Altura techo (m)"
            type="number"
            min="2"
            step="0.05"
            value={plan.ceilingHeight}
            onChange={(event) => updateGlobalDimension('ceilingHeight', event.target.value)}
          />
          <div className="plan-metric plan-metric-readonly">
            <strong>{walls.length}</strong>
            <span>Muros</span>
          </div>
        </div>
      </Card>

      <section className="plan-steps-section" aria-labelledby="plan-mapping-steps">
        <div className="sv-section-heading">
          <span className="eyebrow">Recomendaciones de la IA</span>
          <h2 id="plan-mapping-steps">Pasos sugeridos para mapear tu plano</h2>
          <p>
            OpenAI analizó tu boceto y propone estas acciones. Úsalas como guía antes de subir
            un dibujo más detallado.
          </p>
        </div>

        <ol className="plan-steps-list">
          {plan.mappingSteps.map((step, index) => {
            const Icon = STEP_ICONS[index % STEP_ICONS.length];
            return (
              <li key={step.step} className="plan-step-card">
                <span className="plan-step-number">{step.step}</span>
                <span className="plan-step-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <div className="plan-step-copy">
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                  <div className="plan-step-spec">
                    <span>Especificación sugerida</span>
                    <p>{step.specification}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <Card className="sv-section-card plan-refine-card">
        <div className="sv-section-heading">
          <span className="eyebrow">Refinar plano</span>
          <h2>Sube un boceto mejorado</h2>
          <p>
            Después de aplicar las recomendaciones, carga una versión más clara de tu plano
            para que la IA recalcule el modelo 3D y las especificaciones.
          </p>
        </div>

        <UploadCard imagePreview={refinedPreview} onImageChange={handleRefinedSketchChange} />

        <div className="sv-form-actions sv-form-actions-stack">
          <Button
            type="button"
            onClick={handleRecalculateClick}
            disabled={!refinedFile || isRecalculating}
            fullWidth
          >
            {isRecalculating ? (
              <>Recalculando plano 3D...</>
            ) : (
              <>
                <RefreshCw size={16} /> Recalcular plano con boceto mejorado
              </>
            )}
          </Button>
        </div>

        {recalculateError ? <p className="plan-error-message">{recalculateError}</p> : null}
      </Card>

      <Card className="sv-section-card">
        <div className="sv-section-heading plan-rooms-heading">
          <div>
            <span className="eyebrow">Divisiones del boceto</span>
            <h2>Muros detectados</h2>
            <p>
              Cada muro tiene un número en la planta y el PDF. Usa ese número para saber cuál
              mover aquí.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addWall}>
            <Plus size={16} /> Agregar muro
          </Button>
        </div>

        {walls.length ? (
          <div className="plan-walls-scroll">
            <div className="plan-walls-grid">
              {walls.map((wall, index) => {
                const isHorizontal = wall.orientation === 'horizontal';
                const wallNumber = getWallDisplayNumber(wall, index);
                return (
                  <article
                    key={wall.id}
                    className={`plan-wall-card tone-${wall.zone || 'other'}`}
                  >
                    <div className="plan-wall-card-header">
                      <span className="plan-wall-number-badge">{wallNumber}</span>
                      <strong>Muro #{wallNumber}</strong>
                      <span className="plan-wall-orientation">
                        {isHorizontal ? 'Horizontal' : 'Vertical'}
                      </span>
                      <button
                        type="button"
                        className="plan-room-remove-btn"
                        onClick={() => removeWall(wall.id)}
                        aria-label={`Eliminar muro ${index + 1}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <label className="plan-wall-select-label">
                      Orientación
                      <select
                        value={wall.orientation}
                        onChange={(event) => {
                          const orientation = event.target.value as DetectedWall['orientation'];
                          updateWall(wall.id, {
                            orientation,
                            width: wall.length,
                            length: wall.width,
                          });
                        }}
                      >
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </label>

                    <label className="plan-wall-select-label">
                      Color / zona
                      <select
                        value={wall.zone || 'other'}
                        onChange={(event) => updateWall(wall.id, { zone: event.target.value })}
                      >
                        {WALL_ZONE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="plan-wall-fields">
                      <Input
                        label="Pos. X (m)"
                        type="number"
                        min="0"
                        step="0.1"
                        value={wall.x}
                        onChange={(event) =>
                          updateWallDimension(wall.id, 'x', event.target.value, wall.x)
                        }
                      />
                      <Input
                        label="Pos. Y (m)"
                        type="number"
                        min="0"
                        step="0.1"
                        value={wall.y}
                        onChange={(event) =>
                          updateWallDimension(wall.id, 'y', event.target.value, wall.y)
                        }
                      />
                      <Input
                        label={isHorizontal ? 'Longitud (m)' : 'Grosor (m)'}
                        type="number"
                        min="0.04"
                        step="0.1"
                        value={wall.width}
                        onChange={(event) =>
                          updateWallDimension(wall.id, 'width', event.target.value, wall.width)
                        }
                      />
                      <Input
                        label={isHorizontal ? 'Grosor (m)' : 'Longitud (m)'}
                        type="number"
                        min="0.04"
                        max="0.12"
                        step="0.01"
                        value={wall.length}
                        onChange={(event) =>
                          updateWallDimension(wall.id, 'length', event.target.value, wall.length)
                        }
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="plan-summary-text">
            Aún no hay muros trazados. Analiza un boceto o agrega muros manualmente.
          </p>
        )}
      </Card>

      {plan.notes.length ? (
        <Card className="sv-section-card plan-notes-card">
          <div className="sv-section-heading">
            <span className="eyebrow">Notas</span>
            <h2>Consideraciones técnicas</h2>
          </div>
          <ul className="plan-notes-list">
            {plan.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="sv-section-card plan-export-card">
        <div className="sv-section-heading">
          <span className="eyebrow">Exportar</span>
          <h2>Descargar planta arquitectónica en PDF</h2>
          <p>
            Genera un PDF con dibujo en planta, cotas de muros, escala y cuadro de especificaciones.
          </p>
        </div>
        <div className="sv-form-actions">
          <Button type="button" onClick={onExportPdf} disabled={isExportingPdf} fullWidth>
            {isExportingPdf ? (
              <>Generando PDF...</>
            ) : (
              <>
                <FileDown size={16} /> Exportar planta arquitectónica (PDF)
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
