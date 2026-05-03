import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button, Input, Label } from '@proxy-smart/shared-ui';
import { Textarea } from './ui/textarea';
import { useAlertStore } from '../stores/alertStore';
import {
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';

export function AlertDialog() {
    const { t } = useTranslation();
    const { currentAlert, closeAlert } = useAlertStore();

    if (!currentAlert) return null;

    const getIcon = () => {
        switch (currentAlert.type) {
            case 'success':
                return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />;
            case 'error':
                return <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />;
            default:
                return <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => closeAlert()}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {getIcon()}
                        {currentAlert.title}
                    </DialogTitle>
                    {currentAlert.message && (
                        <DialogDescription className="text-base whitespace-pre-line">
                            {currentAlert.message}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={closeAlert} className="w-full">
                        {currentAlert.confirmText || t('OK')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ConfirmDialog() {
    const { t } = useTranslation();
    const { currentConfirm, closeConfirm } = useAlertStore();
    const [isLoading, setIsLoading] = useState(false);

    if (!currentConfirm) return null;

    const handleConfirm = async () => {
        try {
            setIsLoading(true);
            await currentConfirm.onConfirm();
            closeConfirm();
        } catch (error) {
            console.error('Confirm action failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (currentConfirm.onCancel) {
            currentConfirm.onCancel();
        }
        closeConfirm();
    };

    const getIcon = () => {
        switch (currentConfirm.type) {
            case 'success':
                return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />;
            case 'error':
                return <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />;
            default:
                return <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
        }
    };

    return (
        <Dialog open={true} onOpenChange={() => !isLoading && closeConfirm()}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {getIcon()}
                        {currentConfirm.title}
                    </DialogTitle>
                    {currentConfirm.message && (
                        <DialogDescription className="text-base whitespace-pre-line">
                            {currentConfirm.message}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        {currentConfirm.cancelText || t('Cancel')}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                        variant={currentConfirm.type === 'error' || currentConfirm.type === 'warning' ? 'destructive' : 'default'}
                    >
                        {isLoading ? t('Processing...') : (currentConfirm.confirmText || t('Confirm'))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ConfirmInputDialog() {
    const { t } = useTranslation();
    const { currentConfirmInput, closeConfirmInput } = useAlertStore();
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    if (!currentConfirmInput) return null;

    const validateInput = (value: string) => {
        if (currentConfirmInput.inputRequired && !value.trim()) {
            return t('This field is required');
        }
        
        if (currentConfirmInput.inputValidation) {
            return currentConfirmInput.inputValidation(value);
        }
        
        return null;
    };

    const handleConfirm = async () => {
        const validationError = validateInput(inputValue);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            await currentConfirmInput.onConfirm(inputValue);
            closeConfirmInput();
        } catch (error) {
            console.error('Confirm input action failed:', error);
            setError(error instanceof Error ? error.message : t('An error occurred'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (currentConfirmInput.onCancel) {
            currentConfirmInput.onCancel();
        }
        closeConfirmInput();
    };

    const handleInputChange = (value: string) => {
        setInputValue(value);
        if (error) {
            const validationError = validateInput(value);
            setError(validationError);
        }
    };

    const getIcon = () => {
        switch (currentConfirmInput.type) {
            case 'success':
                return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />;
            case 'warning':
                return <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />;
            case 'error':
                return <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />;
            default:
                return <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
        }
    };

    const InputComponent = currentConfirmInput.inputType === 'textarea' ? Textarea : Input;

    return (
        <Dialog open={true} onOpenChange={() => !isLoading && closeConfirmInput()}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        {getIcon()}
                        {currentConfirmInput.title}
                    </DialogTitle>
                    {currentConfirmInput.message && (
                        <DialogDescription className="text-base whitespace-pre-line">
                            {currentConfirmInput.message}
                        </DialogDescription>
                    )}
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        {currentConfirmInput.inputLabel && (
                            <Label htmlFor="confirm-input">
                                {currentConfirmInput.inputLabel}
                                {currentConfirmInput.inputRequired && (
                                    <span className="text-red-500 ml-1">*</span>
                                )}
                            </Label>
                        )}
                        <InputComponent
                            id="confirm-input"
                            value={inputValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            placeholder={currentConfirmInput.inputPlaceholder}
                            className={error ? 'border-red-500 focus:border-red-500' : ''}
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && currentConfirmInput.inputType !== 'textarea') {
                                    e.preventDefault();
                                    handleConfirm();
                                }
                            }}
                            autoFocus
                        />
                        {error && (
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                    >
                        {currentConfirmInput.cancelText || t('Cancel')}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                        variant={currentConfirmInput.type === 'error' || currentConfirmInput.type === 'warning' ? 'destructive' : 'default'}
                    >
                        {isLoading ? t('Processing...') : (currentConfirmInput.confirmText || t('Confirm'))}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Main component that renders all dialogs
export function AlertDialogs() {
    return (
        <>
            <AlertDialog />
            <ConfirmDialog />
            <ConfirmInputDialog />
        </>
    );
}
