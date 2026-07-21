{{- define "youtube-agent.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "youtube-agent.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "youtube-agent.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "youtube-agent.labels" -}}
helm.sh/chart: {{ include "youtube-agent.chart" .root }}
app.kubernetes.io/name: {{ include "youtube-agent.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
{{- end }}

{{- define "youtube-agent.selectorLabels" -}}
app.kubernetes.io/name: {{ include "youtube-agent.name" .root }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{- define "youtube-agent.internalSecretName" -}}
{{- default (printf "%s-internal" (include "youtube-agent.fullname" .)) .Values.internalService.existingSecret }}
{{- end }}

{{- define "youtube-agent.youtubeSecretName" -}}
{{- default (printf "%s-youtube" (include "youtube-agent.fullname" .)) .Values.secrets.youtube.existingSecret }}
{{- end }}

{{- define "youtube-agent.plansSecretName" -}}
{{- default (printf "%s-plans" (include "youtube-agent.fullname" .)) .Values.secrets.plans.existingSecret }}
{{- end }}
