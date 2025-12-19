import { useState, useEffect, useCallback } from 'react';
import { CameraPermission } from '../../../types/scanner';

export const useCamera = () => {
  const [permission, setPermission] = useState<CameraPermission>({
    state: 'prompt',
    canRequest: true
  });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check current permission status
  const checkPermission = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermission({
          state: 'denied',
          canRequest: false,
          error: 'Camera not supported in this browser'
        });
        return;
      }

      // Check permission status
      const permissionStatus = await navigator.permissions.query({ 
        name: 'camera' as PermissionName 
      });
      
      setPermission(prev => ({
        ...prev,
        state: permissionStatus.state as 'granted' | 'denied' | 'prompt'
      }));

      // Listen for permission changes
      permissionStatus.onchange = () => {
        setPermission(prev => ({
          ...prev,
          state: permissionStatus.state as 'granted' | 'denied' | 'prompt'
        }));
      };

    } catch (error) {
      console.error('Error checking camera permission:', error);
      setPermission({
        state: 'prompt',
        canRequest: true,
        error: 'Unable to check camera permission'
      });
    }
  }, []);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());

      setPermission({
        state: 'granted',
        canRequest: true
      });

      // Get available devices
      await getDevices();
      
      return true;
    } catch (error: any) {
      console.error('Camera permission denied:', error);
      
      let errorMessage = 'Camera permission denied';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied by user';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Camera not supported in this browser';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application';
      }
      
      setPermission({
        state: 'denied',
        canRequest: true,
        error: errorMessage
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(cameras);
    } catch (error) {
      console.error('Error getting camera devices:', error);
    }
  }, []);

  // Check if HTTPS is required
  const isHttpsRequired = useCallback(() => {
    return location.protocol !== 'https:' && location.hostname !== 'localhost';
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    permission,
    devices,
    isLoading,
    requestPermission,
    checkPermission,
    getDevices,
    isHttpsRequired
  };
};