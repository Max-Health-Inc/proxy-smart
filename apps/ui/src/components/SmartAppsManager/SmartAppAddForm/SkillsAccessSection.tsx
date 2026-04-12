import { Badge } from '@proxy-smart/shared-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SmartAppFormData } from '@/lib/types/api';
import type { GetAdminAiToolsSkills200ResponseSkillsInner } from '@/lib/api-client';

interface SkillsAccessSectionProps {
    newApp: SmartAppFormData;
    updateApp: (patch: Partial<SmartAppFormData>) => void;
    skills: GetAdminAiToolsSkills200ResponseSkillsInner[];
    skillsLoading: boolean;
}

export function SkillsAccessSection({ newApp, updateApp, skills, skillsLoading }: SkillsAccessSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-6 p-6 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shadow-sm">
                    <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                    <h4 className="text-lg font-bold text-foreground tracking-tight">{t('Skills (AI Knowledge Packages)')}</h4>
                    <p className="text-muted-foreground text-sm font-medium">{t('Assign AI skill packages this application can use')}</p>
                </div>
            </div>

            <div className="space-y-4">
                {skillsLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                        <div className="animate-spin inline-block w-4 h-4 border-2 border-border/50 border-t-primary rounded-full mr-2"></div>
                        {t('Loading available skills...')}
                    </div>
                ) : skills.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground bg-muted/50 rounded-lg border border-border/50">
                        <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm">{t('No skills installed')}</p>
                        <p className="text-xs text-muted-foreground">{t('Install skills from the AI Tools page first')}</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-card rounded-lg border border-border/50">
                        {skills.map((skill) => (
                            <label key={skill.name} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer">
                                <Checkbox
                                    checked={(newApp.allowedSkillNames || []).includes(skill.name)}
                                    onCheckedChange={(checked) => {
                                        const skillNames = checked === true
                                            ? [...(newApp.allowedSkillNames || []), skill.name]
                                            : (newApp.allowedSkillNames || []).filter(name => name !== skill.name);
                                        updateApp({ allowedSkillNames: skillNames });
                                    }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-foreground truncate">{skill.name}</span>
                                        {skill.enabled ? (
                                            <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                        <span className="truncate">{skill.description}</span>
                                        <Badge variant="outline" className="text-xs">{skill.type}</Badge>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
                {(newApp.allowedSkillNames || []).length > 0 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ✓ {(newApp.allowedSkillNames || []).length} skill(s) selected
                    </div>
                )}
            </div>
        </div>
    );
}
