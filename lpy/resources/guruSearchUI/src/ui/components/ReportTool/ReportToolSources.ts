/*
 * Copyright 2009-2024 C3 AI (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

// Report Tool Engine Log
export interface ReportToolEngineLog {
  reporttitle: string;
  docid: string;
  classification: string;
  url: string;
  score: number;
}

// Get ReportTool sources
export function getReportToolSources(engineLog: any): ReportToolEngineLog[] | null {
  try {
    if (engineLog !== null) {
      const parsedLog = JSON.parse(engineLog);
      if (parsedLog.length > 0 && 'ranked_documents' in parsedLog[0]) {
        const reportSources = JSON.parse(JSON.parse(parsedLog[0]['ranked_documents']));
        return reportSources;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (error) {
    console.error('Failed to parse engineLog:', error);
    return null;
  }
}

export interface ReportQueryProps {
  engineLog: any;
}
