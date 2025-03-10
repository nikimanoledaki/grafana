import { trim } from 'lodash';
import React, { useState } from 'react';

import { CoreApp, isValidDuration, SelectableValue } from '@grafana/data';
import { EditorField, EditorRow } from '@grafana/experimental';
import { config, reportInteraction } from '@grafana/runtime';
import { AutoSizeInput, RadioButtonGroup, Select } from '@grafana/ui';
import { QueryOptionGroup } from 'app/plugins/datasource/prometheus/querybuilder/shared/QueryOptionGroup';

import { preprocessMaxLines, queryTypeOptions, RESOLUTION_OPTIONS } from '../../components/LokiOptionFields';
import { isLogsQuery } from '../../queryUtils';
import { LokiQuery, LokiQueryType, QueryStats } from '../../types';

export interface Props {
  query: LokiQuery;
  onChange: (update: LokiQuery) => void;
  onRunQuery: () => void;
  maxLines: number;
  app?: CoreApp;
  queryStats: QueryStats | null;
}

export const LokiQueryBuilderOptions = React.memo<Props>(
  ({ app, query, onChange, onRunQuery, maxLines, queryStats }) => {
    const [splitDurationValid, setSplitDurationValid] = useState(true);

    const onQueryTypeChange = (value: LokiQueryType) => {
      onChange({ ...query, queryType: value });
      onRunQuery();
    };

    const onResolutionChange = (option: SelectableValue<number>) => {
      reportInteraction('grafana_loki_resolution_clicked', {
        app,
        resolution: option.value,
      });
      onChange({ ...query, resolution: option.value });
      onRunQuery();
    };

    const onChunkRangeChange = (evt: React.FormEvent<HTMLInputElement>) => {
      const value = evt.currentTarget.value;
      if (!isValidDuration(value)) {
        setSplitDurationValid(false);
        return;
      }
      setSplitDurationValid(true);
      onChange({ ...query, splitDuration: value });
      onRunQuery();
    };

    const onLegendFormatChanged = (evt: React.FormEvent<HTMLInputElement>) => {
      onChange({ ...query, legendFormat: evt.currentTarget.value });
      onRunQuery();
    };

    function onMaxLinesChange(e: React.SyntheticEvent<HTMLInputElement>) {
      const newMaxLines = preprocessMaxLines(e.currentTarget.value);
      if (query.maxLines !== newMaxLines) {
        onChange({ ...query, maxLines: newMaxLines });
        onRunQuery();
      }
    }

    function onStepChange(e: React.SyntheticEvent<HTMLInputElement>) {
      onChange({ ...query, step: trim(e.currentTarget.value) });
      onRunQuery();
    }

    const queryType = query.queryType ?? (query.instant ? LokiQueryType.Instant : LokiQueryType.Range);
    const isLogQuery = isLogsQuery(query.expr);

    return (
      <EditorRow>
        <QueryOptionGroup
          title="Options"
          collapsedInfo={getCollapsedInfo(query, queryType, maxLines, isLogQuery)}
          queryStats={queryStats}
        >
          <EditorField
            label="Legend"
            tooltip="Series name override or template. Ex. {{hostname}} will be replaced with label value for hostname."
          >
            <AutoSizeInput
              placeholder="{{label}}"
              type="string"
              minWidth={14}
              defaultValue={query.legendFormat}
              onCommitChange={onLegendFormatChanged}
            />
          </EditorField>
          <EditorField label="Type">
            <RadioButtonGroup options={queryTypeOptions} value={queryType} onChange={onQueryTypeChange} />
          </EditorField>
          {isLogQuery && (
            <EditorField label="Line limit" tooltip="Upper limit for number of log lines returned by query.">
              <AutoSizeInput
                className="width-4"
                placeholder={maxLines.toString()}
                type="number"
                min={0}
                defaultValue={query.maxLines?.toString() ?? ''}
                onCommitChange={onMaxLinesChange}
              />
            </EditorField>
          )}
          {!isLogQuery && (
            <>
              <EditorField
                label="Step"
                tooltip="Use the step parameter when making metric queries to Loki. If not filled, Grafana's calculated interval will be used. Example valid values: 1s, 5m, 10h, 1d."
              >
                <AutoSizeInput
                  className="width-6"
                  placeholder={'auto'}
                  type="string"
                  defaultValue={query.step ?? ''}
                  onCommitChange={onStepChange}
                />
              </EditorField>
              <EditorField
                label="Resolution"
                tooltip="Changes the step parameter of Loki metrics range queries. With a resolution of 1/1, each pixel corresponds to one data point. 1/10 retrieves one data point per 10 pixels. Lower resolutions perform better."
              >
                <Select
                  isSearchable={false}
                  onChange={onResolutionChange}
                  options={RESOLUTION_OPTIONS}
                  value={query.resolution || 1}
                  aria-label="Select resolution"
                />
              </EditorField>
            </>
          )}
          {config.featureToggles.lokiQuerySplittingConfig && config.featureToggles.lokiQuerySplitting && (
            <EditorField
              label="Split Duration"
              tooltip="Defines the duration of a single query when query splitting is enabled."
            >
              <AutoSizeInput
                minWidth={14}
                type="string"
                min={0}
                defaultValue={query.splitDuration ?? '1d'}
                onCommitChange={onChunkRangeChange}
                invalid={!splitDurationValid}
              />
            </EditorField>
          )}
        </QueryOptionGroup>
      </EditorRow>
    );
  }
);

function getCollapsedInfo(query: LokiQuery, queryType: LokiQueryType, maxLines: number, isLogQuery: boolean): string[] {
  const queryTypeLabel = queryTypeOptions.find((x) => x.value === queryType);
  const resolutionLabel = RESOLUTION_OPTIONS.find((x) => x.value === (query.resolution ?? 1));

  const items: string[] = [];

  if (query.legendFormat) {
    items.push(`Legend: ${query.legendFormat}`);
  }

  if (query.resolution) {
    items.push(`Resolution: ${resolutionLabel?.label}`);
  }

  items.push(`Type: ${queryTypeLabel?.label}`);

  if (isLogQuery) {
    items.push(`Line limit: ${query.maxLines ?? maxLines}`);
  }

  if (!isLogQuery) {
    if (query.step) {
      items.push(`Step: ${query.step}`);
    }

    if (query.resolution) {
      items.push(`Resolution: ${resolutionLabel?.label}`);
    }
  }

  return items;
}

LokiQueryBuilderOptions.displayName = 'LokiQueryBuilderOptions';
