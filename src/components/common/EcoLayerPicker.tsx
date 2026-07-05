import { Lightbulb, Sun, Wind } from 'lucide-react';
import { ECO_LAYER_OPTIONS, EcoViewLayers } from '../../types/ecoAnalysis';

const LAYER_ICONS = {
  ventilacion: Wind,
  viento: Wind,
  luz: Lightbulb,
  ventanas: Sun,
} as const;

type EcoLayerPickerProps = {
  layers: EcoViewLayers;
  onChange: (layers: EcoViewLayers) => void;
  legend?: boolean;
};

export function EcoLayerPicker({ layers, onChange, legend = false }: EcoLayerPickerProps) {
  return (
    <fieldset className="eco-layer-picker">
      <legend>{legend ? 'Capas visibles en el modelo 3D' : 'Elige qué incluir en tu análisis'}</legend>
      <div className="eco-layer-grid">
        {ECO_LAYER_OPTIONS.map(({ key, label, description }) => {
          const Icon = LAYER_ICONS[key];
          const isActive = layers[key];

          return (
            <label
              key={key}
              className={`eco-layer-option eco-layer-${key}${isActive ? ' eco-layer-option-active' : ''}`}
            >
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) =>
                  onChange({
                    ...layers,
                    [key]: event.target.checked,
                  })
                }
              />
              <span className="eco-layer-option-icon" aria-hidden="true">
                <Icon size={16} />
              </span>
              <span className="eco-layer-option-copy">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
