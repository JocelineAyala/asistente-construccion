import { ChangeEvent } from 'react';
import { ImageUp } from 'lucide-react';
import { Card } from '../ui/Card';

type UploadCardProps = {
  imagePreview?: string;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function UploadCard({ imagePreview, onImageChange }: UploadCardProps) {
  return (
    <Card className="upload-card">
      <div className="upload-preview">
        {imagePreview ? (
          <img src={imagePreview} alt="Vista previa del espacio seleccionado" />
        ) : (
          <div className="upload-empty">
            <ImageUp size={32} />
            <span>Vista previa de imagen</span>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <label className="button button-secondary button-full">
          <ImageUp size={18} />
          Actualizar fotografia
          <input type="file" accept="image/*" onChange={onImageChange} />
        </label>
      </div>
    </Card>
  );
}
