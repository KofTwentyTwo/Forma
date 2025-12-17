/**
 * Confluence Cloud REST API client
 */

export interface ConfluenceClientConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export interface Page {
  id: string;
  title: string;
  spaceId?: string;
  parentId?: string;
  version?: number;
  body?: string;
}

export interface ContentProperty {
  key: string;
  value: unknown;
  version?: number;
}

export interface Attachment {
  id: string;
  title: string;
  mediaType: string;
  fileSize: number;
}

interface ApiError {
  statusCode: number;
  message: string;
}

export class ConfluenceClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: ConfluenceClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = 'Basic ' + Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    contentType = 'application/json'
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
    };

    if (body && contentType) {
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body as BodyInit) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText) as ApiError;
        errorMessage = errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(`Confluence API error (${response.status}): ${errorMessage}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get a page by ID
   */
  async getPage(pageId: string, expand?: string[]): Promise<Page> {
    const expandParam = expand?.length ? `?expand=${expand.join(',')}` : '';
    const data = await this.request<{
      id: string;
      title: string;
      spaceId?: string;
      parentId?: string;
      version?: { number: number };
      body?: { storage?: { value: string } };
    }>('GET', `/rest/api/content/${pageId}${expandParam}`);

    return {
      id: data.id,
      title: data.title,
      spaceId: data.spaceId,
      parentId: data.parentId,
      version: data.version?.number,
      body: data.body?.storage?.value,
    };
  }

  /**
   * Get child pages of a parent page
   */
  async getChildren(pageId: string): Promise<Page[]> {
    const data = await this.request<{
      results: Array<{ id: string; title: string }>;
    }>('GET', `/rest/api/content/${pageId}/child/page?limit=250`);

    return data.results.map(p => ({ id: p.id, title: p.title }));
  }

  /**
   * Find pages by content property in a space
   */
  async findPagesByProperty(
    spaceKey: string,
    propertyKey: string,
    propertyValue: string
  ): Promise<Page[]> {
    // CQL query to find pages with specific content property
    const cql = encodeURIComponent(
      `space="${spaceKey}" AND type=page`
    );
    const data = await this.request<{
      results: Array<{ id: string; title: string }>;
    }>('GET', `/rest/api/content/search?cql=${cql}&limit=250`);

    // Filter by property (CQL doesn't support content property filtering directly)
    const matches: Page[] = [];
    for (const page of data.results) {
      try {
        const prop = await this.getContentProperty(page.id, propertyKey);
        if (prop?.value === propertyValue) {
          matches.push({ id: page.id, title: page.title });
        }
      } catch {
        // Property doesn't exist on this page, skip
      }
    }
    return matches;
  }

  /**
   * Create a new page
   */
  async createPage(
    spaceKey: string,
    parentId: string | null,
    title: string,
    body: string
  ): Promise<Page> {
    const payload: Record<string, unknown> = {
      type: 'page',
      title,
      space: { key: spaceKey },
      body: {
        storage: {
          value: body,
          representation: 'storage',
        },
      },
    };

    if (parentId) {
      payload.ancestors = [{ id: parentId }];
    }

    const data = await this.request<{
      id: string;
      title: string;
      version: { number: number };
    }>('POST', '/rest/api/content', payload);

    return {
      id: data.id,
      title: data.title,
      version: data.version.number,
    };
  }

  /**
   * Update an existing page
   */
  async updatePage(
    pageId: string,
    title: string,
    body: string,
    currentVersion: number
  ): Promise<Page> {
    const payload = {
      type: 'page',
      title,
      body: {
        storage: {
          value: body,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
      },
    };

    const data = await this.request<{
      id: string;
      title: string;
      version: { number: number };
    }>('PUT', `/rest/api/content/${pageId}`, payload);

    return {
      id: data.id,
      title: data.title,
      version: data.version.number,
    };
  }

  /**
   * Get a content property from a page
   */
  async getContentProperty(pageId: string, key: string): Promise<ContentProperty | null> {
    try {
      const data = await this.request<{
        key: string;
        value: unknown;
        version: { number: number };
      }>('GET', `/rest/api/content/${pageId}/property/${key}`);

      return {
        key: data.key,
        value: data.value,
        version: data.version.number,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Set a content property on a page
   */
  async setContentProperty(
    pageId: string,
    key: string,
    value: unknown,
    existingVersion?: number
  ): Promise<ContentProperty> {
    const payload = {
      key,
      value,
      version: {
        number: (existingVersion ?? 0) + 1,
      },
    };

    const method = existingVersion !== undefined ? 'PUT' : 'POST';
    const path = existingVersion !== undefined
      ? `/rest/api/content/${pageId}/property/${key}`
      : `/rest/api/content/${pageId}/property`;

    const data = await this.request<{
      key: string;
      value: unknown;
      version: { number: number };
    }>(method, path, payload);

    return {
      key: data.key,
      value: data.value,
      version: data.version.number,
    };
  }

  /**
   * Get all attachments for a page
   */
  async getAttachments(pageId: string): Promise<Attachment[]> {
    const data = await this.request<{
      results: Array<{
        id: string;
        title: string;
        metadata: { mediaType: string };
        extensions: { fileSize: number };
      }>;
    }>('GET', `/rest/api/content/${pageId}/child/attachment?limit=250`);

    return data.results.map(a => ({
      id: a.id,
      title: a.title,
      mediaType: a.metadata.mediaType,
      fileSize: a.extensions.fileSize,
    }));
  }

  /**
   * Upload or update an attachment
   */
  async uploadAttachment(
    pageId: string,
    fileName: string,
    data: Buffer,
    mimeType: string
  ): Promise<Attachment> {
    // Check if attachment already exists
    const existing = await this.getAttachments(pageId);
    const existingAtt = existing.find(a => a.title === fileName);

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const body = this.buildMultipartBody(boundary, fileName, data, mimeType);

    const path = existingAtt
      ? `/rest/api/content/${pageId}/child/attachment/${existingAtt.id}/data`
      : `/rest/api/content/${pageId}/child/attachment`;

    // Attachment upload requires X-Atlassian-Token header
    const result = await this.requestWithXsrf<{
      results?: Array<{ id: string; title: string; metadata: { mediaType: string }; extensions: { fileSize: number } }>;
      id?: string;
      title?: string;
      metadata?: { mediaType: string };
      extensions?: { fileSize: number };
    }>(
      'POST',
      path,
      body,
      `multipart/form-data; boundary=${boundary}`
    );

    const att = result.results?.[0] ?? result;
    return {
      id: att.id!,
      title: att.title!,
      mediaType: att.metadata!.mediaType,
      fileSize: att.extensions!.fileSize,
    };
  }

  private async requestWithXsrf<T>(
    method: string,
    path: string,
    body: Buffer,
    contentType: string
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Accept': 'application/json',
      'Content-Type': contentType,
      'X-Atlassian-Token': 'nocheck',
    };

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Confluence API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  private buildMultipartBody(
    boundary: string,
    fileName: string,
    data: Buffer,
    mimeType: string
  ): Buffer {
    const header = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
      `Content-Type: ${mimeType}`,
      '',
      '',
    ].join('\r\n');

    const footer = `\r\n--${boundary}--\r\n`;

    return Buffer.concat([
      Buffer.from(header),
      data,
      Buffer.from(footer),
    ]);
  }

  /**
   * Check if a specific macro/app is available
   */
  async checkMacroAvailable(macroKey: string): Promise<boolean> {
    try {
      // Try to get app info - this varies by macro
      // For Mermaid, we check if the macro exists in content templates
      await this.request<unknown>('GET', `/rest/api/contentbody/convert/storage`);
      // If we can convert content, check for macro in a test conversion
      return true; // Simplified - would need actual macro detection
    } catch {
      return false;
    }
  }

  /**
   * Delete a page (move to trash)
   */
  async deletePage(pageId: string): Promise<void> {
    await this.request<void>('DELETE', `/rest/api/content/${pageId}`);
  }

  /**
   * Archive a page (if supported)
   */
  async archivePage(pageId: string): Promise<void> {
    // Confluence Cloud doesn't have a direct archive API for pages
    // Fall back to delete (moves to trash)
    await this.deletePage(pageId);
  }

  /**
   * Add labels to a page
   */
  async addLabels(pageId: string, labels: string[]): Promise<void> {
    const payload = labels.map(name => ({ prefix: 'global', name }));
    await this.request<unknown>('POST', `/rest/api/content/${pageId}/label`, payload);
  }

  /**
   * Get space info
   */
  async getSpace(spaceKey: string): Promise<{ id: string; name: string; key: string }> {
    return this.request<{ id: string; name: string; key: string }>(
      'GET',
      `/rest/api/space/${spaceKey}`
    );
  }
}
