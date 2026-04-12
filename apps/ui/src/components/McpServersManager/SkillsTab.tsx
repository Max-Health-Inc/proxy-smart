import { Badge, Button } from '@proxy-smart/shared-ui';
import {
  BookOpen,
  Globe,
  Link2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AssignedAppsBadges } from '../AssignAppsDialog';
import type { Skill, SmartApp } from './types';

interface SkillsTabProps {
  skills: Skill[];
  skillsLoading: boolean;
  smartApps: SmartApp[];
  onOpenAssign: (name: string, field: 'allowedMcpServerNames' | 'allowedSkillNames', label: string) => void;
  onDeleteSkill: (name: string) => void;
  onOpenSkillsRegistry: () => void;
  onOpenAddSkill: () => void;
}

export function SkillsTab({
  skills,
  skillsLoading,
  smartApps,
  onOpenAssign,
  onDeleteSkill,
  onOpenSkillsRegistry,
  onOpenAddSkill,
}: SkillsTabProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card/70 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-2xl border border-border/50 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight">
              {t('Installed Skills')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('Claude Skills and custom AI skill packages assigned to SMART apps')}
            </p>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {skills.length} {skills.length === 1 ? t('skill') : t('skills')}
        </div>
      </div>

      <div className="space-y-4">
        {skillsLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">{t('Loading skills...')}</p>
          </div>
        ) : skills.length > 0 ? (
          skills.map((skill) => (
            <div key={skill.name} className="rounded-xl border bg-muted/20 border-border/50">
              <div className="flex items-center justify-between py-4 px-5">
                <div className="flex items-center flex-1">
                  <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mr-4">
                    <BookOpen className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-foreground font-medium">{skill.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {skill.type}
                      </Badge>
                    </div>
                    {skill.description && (
                      <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                    )}
                    {skill.sourceUrl && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {skill.sourceUrl}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title={t('Assign to SMART Apps')}
                    onClick={() => onOpenAssign(skill.name, 'allowedSkillNames', 'skill')}
                  >
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                    onClick={() => onDeleteSkill(skill.name)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="px-5 pb-4">
                <AssignedAppsBadges
                  resourceName={skill.name}
                  field="allowedSkillNames"
                  smartApps={smartApps}
                  onManage={() => onOpenAssign(skill.name, 'allowedSkillNames', 'skill')}
                  emptyMessage={t('No SMART apps are using this skill yet.')}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-semibold text-foreground mb-2">
              {t('No Skills Installed')}
            </h4>
            <p className="text-muted-foreground text-sm mb-4">
              {t('Skills are AI capability packages that can be assigned to SMART apps.')}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="default" onClick={onOpenSkillsRegistry}>
                <Globe className="w-4 h-4 mr-2" />
                {t('Browse skills.sh')}
              </Button>
              <Button variant="outline" onClick={onOpenAddSkill}>
                <Plus className="w-4 h-4 mr-2" />
                {t('Add Manually')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
