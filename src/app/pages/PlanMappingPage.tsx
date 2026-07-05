import { ChangeEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Box, Cpu, Save, Sparkles } from 'lucide-react';
import houseIllustration from '../../assets/illustrations/house.svg';
import { ArchitecturalFloorPlan2D } from '../../components/common/ArchitecturalFloorPlan2D';
import { FloorPlanModel3D } from '../../components/common/FloorPlanModel3D';
import { PageTitle } from '../../components/common/PageTitle';
import { PlanMappingSpecs } from '../../components/common/PlanMappingSpecs';
import { UploadCard } from '../../components/common/UploadCard';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { FloorPlanAnalysis } from '../../types/floorPlan';
import {
  analyzeFloorPlanSketch,
  clearFloorPlanSession,
  loadFloorPlanSession,
  saveFloorPlanSession,
} from '../../utils/analyzeFloorPlan';
import { fileToBase64, fileToDataUrl, isOpenAiConfigured } from '../../utils/openai';
import { getConfiguredPipelineLabels } from '../../config/floorPlanApis';
import { runSketchEnhancementPipeline } from '../../services/floorPlanPipeline';
import { getUserProject, saveUserProject } from '../../services/projectService';
import { exportFloorPlanPdf } from '../../utils/exportFloorPlanPdf';
import { buildPlanFromSketch, preprocessSketch } from '../../utils/sketchGeometry';
import { ensureWallMetadata } from '../../utils/planWallUtils';
import { applyWallLayout } from '../../utils/wallRoomLayout';

const PENDING_PLAN_SKETCH_KEY = 'buildassist:pending-plan-sketch';

function withWallMetadata(plan: FloorPlanAnalysis): FloorPlanAnalysis {
  if (!plan.detectedWalls?.length) return plan;
  const withMeta = {
    ...plan,
    detectedWalls: ensureWallMetadata(plan.detectedWalls, plan.rooms),
  };
  return applyWallLayout(withMeta);
}

export function PlanMappingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const hasOpenAi = isOpenAiConfigured();
  const pipelineLabels = getConfiguredPipelineLabels();

  const [sketchPreview, setSketchPreview] = useState<string>();
  const [sketchFile, setSketchFile] = useState<File>();
  const [analysis, setAnalysis] = useState<FloorPlanAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recalculateError, setRecalculateError] = useState('');

  useEffect(() => {
    const pendingSketch = sessionStorage.getItem(PENDING_PLAN_SKETCH_KEY);
    if (pendingSketch) {
      clearFloorPlanSession();
      setSketchPreview(pendingSketch);
      setSketchFile(undefined);
      setAnalysis(null);
      sessionStorage.removeItem(PENDING_PLAN_SKETCH_KEY);
      return;
    }

    const saved = loadFloorPlanSession();
    if (saved) {
      setSketchPreview(saved.sketchPreview);
      setAnalysis(withWallMetadata(saved.analysis));
    }

    const state = location.state as { sketchPreview?: string } | null;
    if (state?.sketchPreview) {
      clearFloorPlanSession();
      setSketchPreview(state.sketchPreview);
      setSketchFile(undefined);
      setAnalysis(null);
    }
  }, [location.state]);

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (!projectId || !user) return;

    getUserProject(user.uid, projectId)
      .then((project) => {
        if (!project?.analysisJson) return;

        const parsedAnalysis = withWallMetadata(JSON.parse(project.analysisJson) as FloorPlanAnalysis);
        setAnalysis(parsedAnalysis);
        if (project.sketchPreviewUrl) {
          setSketchPreview(project.sketchPreviewUrl);
        }
        saveFloorPlanSession(project.sketchPreviewUrl || '', parsedAnalysis);
      })
      .catch(() => {
        setRecalculateError('No se pudo abrir el proyecto guardado.');
      });
  }, [searchParams, user]);

  const handleSketchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (sketchPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(sketchPreview);
    }

    clearFloorPlanSession();
    setSketchFile(file);
    setSketchPreview(URL.createObjectURL(file));
    setAnalysis(null);
    setErrorMessage('');
  };

  const handleAnalyze = async () => {
    if (!sketchFile && !sketchPreview) return;

    setIsAnalyzing(true);
    setErrorMessage('');

    try {
      let preview = sketchPreview;
      let base64 = '';

      if (sketchFile) {
        base64 = await fileToBase64(sketchFile);
        preview = await fileToDataUrl(sketchFile);
      } else if (sketchPreview?.startsWith('data:image')) {
        base64 = sketchPreview.split(',')[1] || '';
        preview = sketchPreview;
      } else if (sketchPreview) {
        throw new Error('Vuelve a subir el boceto para generar el mapeo.');
      } else {
        throw new Error('No se pudo leer la imagen del boceto.');
      }

      const pipeline = await runSketchEnhancementPipeline(preview);
      const processed = await preprocessSketch(pipeline.processedDataUrl);
      const aiResult = await analyzeFloorPlanSketch(processed.base64, {
        imageWidth: processed.width,
        imageHeight: processed.height,
        dimensionHints: pipeline.dimensionNotes,
      });
      const { plan, displaySketch } = await buildPlanFromSketch(preview, aiResult, pipeline);
      setAnalysis(plan);
      setSketchPreview(displaySketch);
      saveFloorPlanSession(displaySketch, plan);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al analizar el plano.';
      setErrorMessage(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePlanChange = (updatedPlan: FloorPlanAnalysis) => {
    setAnalysis(updatedPlan);
    if (sketchPreview) {
      saveFloorPlanSession(sketchPreview, updatedPlan);
    }
  };

  const runPlanAnalysis = async (_base64: string, preview: string) => {
    const pipeline = await runSketchEnhancementPipeline(preview);
    const processed = await preprocessSketch(pipeline.processedDataUrl);
    const aiResult = await analyzeFloorPlanSketch(processed.base64, {
      imageWidth: processed.width,
      imageHeight: processed.height,
      dimensionHints: pipeline.dimensionNotes,
    });
    const { plan, displaySketch } = await buildPlanFromSketch(preview, aiResult, pipeline);
    setAnalysis(plan);
    setSketchPreview(displaySketch);
    saveFloorPlanSession(displaySketch, plan);
  };

  const handleRecalculate = async (file: File) => {
    setIsRecalculating(true);
    setRecalculateError('');

    try {
      const base64 = await fileToBase64(file);
      const dataUrl = await fileToDataUrl(file);
      setSketchFile(file);
      await runPlanAnalysis(base64, dataUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al recalcular el plano.';
      setRecalculateError(message);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!analysis) return;

    setIsExportingPdf(true);
    try {
      await exportFloorPlanPdf(analysis);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo exportar el PDF.';
      setRecalculateError(message);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveProject = async () => {
    if (!analysis) return;

    if (!user) {
      navigate('/login?redirect=/usuario/dibujar-plano');
      return;
    }

    const defaultTitle = `Plano ${new Date().toLocaleDateString('es-SV')}`;
    const title = window.prompt('Nombre del proyecto', defaultTitle)?.trim() || defaultTitle;

    setIsSavingProject(true);
    setSaveMessage('');

    try {
      await saveUserProject(user.uid, {
        title,
        projectType: 'floor-plan',
        sketchPreview: sketchPreview,
        analysisJson: JSON.stringify(analysis),
        summary: analysis.summary,
      });
      setSaveMessage('Proyecto guardado. Puedes verlo en Historial.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el proyecto.';
      setRecalculateError(message);
    } finally {
      setIsSavingProject(false);
    }
  };

  return (
    <div className="page-grid sv-page-panel sv-plan-mapping-page">
      <section className="sv-hero">
        <PageTitle eyebrow="Dibujar plano" title="Mapeo y modelo 3D del boceto">
          <span className="sv-title-accent" aria-hidden="true" />
          <p>
            La IA interpreta tu dibujo, genera pasos de levantamiento con especificaciones y
            levanta un modelo 3D proporcional del plano detectado.
          </p>
        </PageTitle>
        <img className="sv-hero-house" src={houseIllustration} alt="" aria-hidden="true" />
      </section>

      <div className="plan-mapping-toolbar">
        <Link to="/usuario/nueva-consulta" className="button button-secondary">
          <ArrowLeft size={16} /> Volver a nueva consulta
        </Link>
        <div className="plan-mapping-toolbar-actions">
          {analysis ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleSaveProject}
                disabled={isSavingProject}
              >
                <Save size={16} />
                {isSavingProject ? 'Guardando...' : 'Guardar proyecto'}
              </Button>
              {saveMessage ? <span className="plan-save-message">{saveMessage}</span> : null}
            </>
          ) : null}
          {hasOpenAi ? (
            <span className="api-badge api-badge-connected">
              <Cpu size={12} />
              OpenAI Vision
            </span>
          ) : (
            <span className="api-badge api-badge-simulated">Simulador</span>
          )}
          {pipelineLabels.map((label) => (
            <span key={label} className="api-badge api-badge-connected">
              {label}
            </span>
          ))}
        </div>
      </div>

      {!analysis ? (
        <Card className="sv-section-card">
          <div className="sv-section-heading">
            <span className="eyebrow">Paso 1</span>
            <h2>Sube el boceto de tu plano</h2>
            <p>Foto, escaneo o dibujo a mano de la distribución de tu edificación o estructura.</p>
          </div>

          <UploadCard imagePreview={sketchPreview} onImageChange={handleSketchChange} />

          <div className="sv-form-actions sv-form-actions-stack">
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={!sketchPreview || isAnalyzing}
              fullWidth
            >
              {isAnalyzing ? (
                <>Generando especificaciones y modelo 3D...</>
              ) : (
                <>
                  <Sparkles size={16} /> Generar mapeo del plano
                </>
              )}
            </Button>
          </div>

          {errorMessage ? <p className="plan-error-message">{errorMessage}</p> : null}
        </Card>
      ) : (
        <div className="plan-workspace">
          <aside className="plan-workspace-details">
            <Card className="sv-section-card plan-sketch-card">
              <div className="sv-section-heading">
                <span className="eyebrow">Boceto original</span>
                <h2>Referencia del dibujo</h2>
              </div>
              {sketchPreview ? (
                <div className="plan-sketch-preview-large">
                  <img src={sketchPreview} alt="Boceto del plano analizado" />
                </div>
              ) : null}
              <div className="sv-form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setAnalysis(null);
                    navigate('/usuario/dibujar-plano', { replace: true });
                  }}
                >
                  Analizar otro boceto
                </Button>
              </div>
            </Card>

            <PlanMappingSpecs
              plan={analysis}
              onPlanChange={handlePlanChange}
              onRecalculate={handleRecalculate}
              isRecalculating={isRecalculating}
              recalculateError={recalculateError}
              onExportPdf={handleExportPdf}
              isExportingPdf={isExportingPdf}
            />

            {analysis.processingSteps?.length ? (
              <Card className="sv-section-card">
                <div className="sv-section-heading">
                  <span className="eyebrow">Pipeline de imagen</span>
                  <h2>Procesamiento aplicado</h2>
                </div>
                <ul className="plan-processing-steps">
                  {analysis.processingSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </aside>

          <section className="plan-workspace-viewer" aria-label="Vista 3D del plano">
            <Card className="sv-section-card plan-model-card">
              <div className="sv-section-heading">
                <span className="eyebrow">Modelo 3D</span>
                <h2>Estructura levantada desde el plano</h2>
                <p>
                  Muros blancos trazados desde tu boceto + ambientes en color suave abajo.
                  El dibujo queda visible debajo. Arrastra para rotar.
                </p>
              </div>
              <div className="plan-model-header">
                <span className="plan-model-badge">
                  <Box size={16} />
                  {analysis.rooms.length} cuartos · {analysis.detectedWalls?.length ?? 0} muros
                </span>
              </div>
              <FloorPlanModel3D plan={analysis} sketchPreview={sketchPreview} />
            </Card>

            <Card className="sv-section-card plan-2d-card">
              <div className="sv-section-heading">
                <span className="eyebrow">Vista en planta</span>
                <h2>Planta arquitectónica generada</h2>
                <p>
                  Representación 2D con cotas, escala y leyenda. Es lo mismo que se exportará en
                  el PDF.
                </p>
              </div>
              <ArchitecturalFloorPlan2D plan={analysis} />
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
