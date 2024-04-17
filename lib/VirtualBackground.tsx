import { useLocalParticipant } from '@livekit/components-react';
import {
  BackgroundBlur,
  BackgroundOptions,
  ProcessorWrapper,
  VirtualBackground,
} from '@livekit/track-processors';
import { LocalVideoTrack, Track } from 'livekit-client';
import Image from 'next/image';
import { ReactElement, useEffect, useState } from 'react';
import blurJpg from '../assets/blur.jpg';
import natureJpg from '../assets/nature.jpg';
import officeJpg from '../assets/office.jpg';

const vbImages = [
  { name: 'Blur', type: 'blur', image: blurJpg },
  { name: 'Office', type: 'image', image: officeJpg },
  { name: 'Nature', type: 'image', image: natureJpg },
];
type VBItem = (typeof vbImages)[number];

export const isSupported = ProcessorWrapper.isSupported;

type Processors = {
  blur?: ProcessorWrapper<BackgroundOptions>;
  image?: ProcessorWrapper<BackgroundOptions>;
};

export const processors = {
  state: {} as Processors,
  getBlur: function getBlur() {
    if (!isSupported) return;
    if (this.state.blur) return this.state.blur;
    this.state.blur = BackgroundBlur(10, {
      delegate: 'GPU',
    });
    return this.state.blur;
  },
  getImage: function getImage() {
    if (!isSupported) return;
    if (this.state.image) return this.state.image;
    this.state.image = VirtualBackground('', {
      delegate: 'GPU',
    });
    return this.state.image;
  },
};

export const initVideoProcessor = async (track: Track | undefined, options: VBItem | undefined) => {
  if (!(track instanceof LocalVideoTrack) || !track.getProcessor) return;
  const enable = !!options;
  const current = track.getProcessor();
  if (!enable) {
    // disable
    if (current) return track.stopProcessor();
    return;
  }

  const isBlur = options.type === 'blur';
  try {
    // only update if processor is already running
    if (
      !!current &&
      current instanceof ProcessorWrapper &&
      current.name === (isBlur ? 'background-blur' : 'virtual-background')
    ) {
      const processorOptions: BackgroundOptions = isBlur
        ? {
            blurRadius: 10,
          }
        : { imagePath: options.image.src };
      return await current.updateTransformerOptions(processorOptions);
    }

    // first stop current processor
    if (current) await track.stopProcessor();
    if (!isSupported) return;

    // then create new processor
    if (isBlur) {
      const processor = processors.getBlur();
      if (!processor) return;
      await processor.updateTransformerOptions({
        blurRadius: 10,
      });
      return await track.setProcessor(processor);
    } else {
      if (!options.image) return;
      const processor = processors.getImage();
      if (!processor) return;
      await processor.updateTransformerOptions({ imagePath: options.image.src });
      return await track.setProcessor(processor);
    }
  } catch (error) {
    // ! TODO: handle error
    console.error(error);
    return;
  }
};

const VirtualBackgroundComponent = (): ReactElement | null => {
  const [selected, setSelected] = useState<VBItem>();
  const { cameraTrack } = useLocalParticipant();

  useEffect(() => {
    initVideoProcessor(cameraTrack?.track, selected);
  }, [selected, cameraTrack]);

  return (
    <section>
      <h5>Virtual background</h5>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: 6,
        }}
      >
        <button
          type="button"
          className="lk-button-group"
          style={{ borderColor: !selected ? 'var(--lk-accent-bg)' : undefined }}
          onClick={() => setSelected(undefined)}
        >
          <div>
            <div
              style={{
                width: 88,
                height: 56,
              }}
            ></div>
            <div>Disable</div>
          </div>
        </button>
        {vbImages.map((item) => (
          <button
            type="button"
            key={item.name}
            className="lk-button-group"
            style={{
              borderColor: selected?.name === item.name ? 'var(--lk-accent-bg)' : undefined,
            }}
            onClick={() => setSelected(item)}
          >
            <div>
              <Image src={item.image} alt={item.name} width={88} height={50} />
              <div>{item.name}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
export default VirtualBackgroundComponent;
