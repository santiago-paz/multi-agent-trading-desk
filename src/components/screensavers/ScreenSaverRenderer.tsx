import React from 'react';
import { BlankScreen } from './BlankScreen';
import { Mystery } from './Mystery';
import { Text3D } from './Text3D';
import { Pipes3D } from './Pipes3D';
import { Maze3D } from './Maze3D';

interface ScreenSaverRendererProps {
  name: string;
  text?: string;
  isFullScreen?: boolean;
}

export function ScreenSaverRenderer({ name, text, isFullScreen = false }: ScreenSaverRendererProps) {
  switch (name) {
    case 'Blank Screen':
      return <BlankScreen />;
    case 'Mystery':
      return <Mystery isFullScreen={isFullScreen} />;
    case '3D Text':
      return <Text3D text={text} isFullScreen={isFullScreen} />;
    case '3D Pipes':
      return <Pipes3D isFullScreen={isFullScreen} />;
    case '3D Maze':
      return <Maze3D isFullScreen={isFullScreen} />;
    case '(None)':
      return null;
    default:
      // Fallback for not-yet-implemented screen savers
      return (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#000', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative'
        }}>
           <div style={{ color: '#ffffff', fontSize: '10px', fontFamily: '"Pixelated MS Sans Serif", "MS Sans Serif", Arial, sans-serif' }}>
             {name}
           </div>
        </div>
      );
  }
}
