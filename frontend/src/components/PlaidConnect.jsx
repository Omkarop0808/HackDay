import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/UserContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const PlaidLinkButton = ({ config, isLoading, isSyncing }) => {
  const { open, ready } = usePlaidLink(config);

  return (
    <Button 
      onClick={() => open()} 
      disabled={!ready || isLoading || isSyncing}
      className="bg-black text-white hover:bg-zinc-800"
    >
      {isLoading ? 'Connecting...' : 'Connect Bank (Plaid)'}
    </Button>
  );
};

const PlaidConnect = ({ onSyncSuccess }) => {
  const { user } = useUser();
  const [linkToken, setLinkToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check connection status
    axios.get(`${API_URL}/api/plaid/status/${user.uid}`)
      .then(res => setIsConnected(res.data.isConnected))
      .catch(console.error);

    const generateToken = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/api/plaid/create-link-token`, 
          { firebaseUid: user.uid }
        );
        setLinkToken(response.data.link_token);
      } catch (error) {
        console.error('Error generating link token:', error);
      }
    };
    generateToken();
  }, [user]);

  const onSuccess = async (public_token, metadata) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/plaid/exchange-public-token`, {
        public_token,
        institution_name: metadata.institution.name,
        firebaseUid: user.uid
      });
      
      toast.success('Bank connected successfully!');
      setIsConnected(true);
      
      setIsSyncing(true);
      toast.info('Syncing transactions... this may take a few seconds.');
      
      const syncResponse = await axios.post(`${API_URL}/api/plaid/sync`, {
        firebaseUid: user.uid
      });
      toast.success(syncResponse.data.message);
      
      if (onSyncSuccess) onSyncSuccess();
    } catch (error) {
      console.error('Error during Plaid flow:', error);
      toast.error('Failed to connect or sync bank account.');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  const handleUnsync = async () => {
    if (!window.confirm("Are you sure you want to disconnect your bank? This will remove all synced transactions.")) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/api/plaid/disconnect`, { firebaseUid: user.uid });
      setIsConnected(false);
      toast.success('Bank disconnected and transactions unsynced.');
      if (onSyncSuccess) onSyncSuccess();
    } catch (e) {
      toast.error('Failed to unsync bank.');
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    token: linkToken,
    onSuccess,
  };

  return (
    <div className="flex gap-4">
      {!isConnected ? (
        linkToken ? (
          <PlaidLinkButton config={config} isLoading={isLoading} isSyncing={isSyncing} />
        ) : (
          <Button disabled className="bg-black text-white hover:bg-zinc-800">
            Loading...
          </Button>
        )
      ) : (
        <Button 
          onClick={handleUnsync}
          disabled={isLoading || isSyncing}
          variant="destructive"
        >
          {isLoading ? 'Disconnecting...' : 'Unsync Bank'}
        </Button>
      )}
      
      <Button 
        onClick={async () => {
          setIsSyncing(true);
          try {
            const res = await axios.post(
              `${API_URL}/api/plaid/sync`, 
              { firebaseUid: user.uid }
            );
            toast.success(res.data.message);
            if (onSyncSuccess) onSyncSuccess();
          } catch (e) {
            toast.error(e.response?.data?.error || 'Failed to sync');
          } finally {
            setIsSyncing(false);
          }
        }} 
        disabled={!isConnected || isSyncing}
        variant="outline"
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </Button>
    </div>
  );
};

export default PlaidConnect;
