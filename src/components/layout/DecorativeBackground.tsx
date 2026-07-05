import blobBlue from '../../assets/decorations/blob-blue.svg';
import blobGreen from '../../assets/decorations/blob-green.svg';
import dots from '../../assets/decorations/dots.svg';
import house from '../../assets/illustrations/house.svg';
import leaves from '../../assets/decorations/leaves.svg';
import sun from '../../assets/decorations/sun.svg';
import waves from '../../assets/decorations/waves.svg';

export function DecorativeBackground() {
  return (
    <div className="decorative-background" aria-hidden="true">
      <img className="decorative-sun" src={sun} alt="" />
      <img className="decorative-house" src={house} alt="" />
      <img className="decorative-dots" src={dots} alt="" />
      <img className="decorative-blob-blue" src={blobBlue} alt="" />
      <img className="decorative-blob-green" src={blobGreen} alt="" />
      <img className="decorative-waves" src={waves} alt="" />
      <img className="decorative-leaves" src={leaves} alt="" />
    </div>
  );
}
