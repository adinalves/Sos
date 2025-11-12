import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MapeamentoService } from './mapeamento.service';
import { MapeamentoConfig, DEFAULT_MAPPING } from './mapeamento.model';

@Component({
  selector: 'app-mapeamento',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header class="header">
        <h1>⚙️ Mapeamento de Entidades</h1>
        <p class="subtitle">Configure como os campos dos servidores externos são mapeados para o sistema</p>
      </header>

      <div class="content">
        <div class="card">
          <h2>🛡️ Exército Brasileiro (ARMY)</h2>
          <p class="description">Configure o mapeamento dos campos recebidos do servidor ARMY</p>
          
          <div class="section-title">Mapeamento de Campos</div>
          <form class="mapping-form">
            <div class="field-group">
              <label>
                <span class="field-label">ID (opcional)</span>
                <span class="field-hint">Campo do JSON que contém o identificador único. Deixe vazio para gerar automaticamente.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.mapping.id" 
                  name="army-id"
                  placeholder="Ex: identificador, id, codigo"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Nome *</span>
                <span class="field-hint">Campo do JSON que contém o nome do evento</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.mapping.nome" 
                  name="army-nome"
                  required
                  placeholder="Ex: nome, titulo, name"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Descrição (opcional)</span>
                <span class="field-hint">Campo do JSON que contém a descrição do evento</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.mapping.descricao" 
                  name="army-descricao"
                  placeholder="Ex: descricao, description, detalhes"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Latitude *</span>
                <span class="field-hint">Campo do JSON que contém a latitude</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.mapping.latitude" 
                  name="army-latitude"
                  required
                  placeholder="Ex: latitude, lat, latitud"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Longitude *</span>
                <span class="field-hint">Campo do JSON que contém a longitude</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.mapping.longitude" 
                  name="army-longitude"
                  required
                  placeholder="Ex: longitude, lng, long, longitud"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Timestamp (opcional)</span>
                <span class="field-hint">Campo do JSON que contém o timestamp. Deixe vazio para usar o timestamp atual.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.mapping.ts" 
                  name="army-ts"
                  placeholder="Ex: ts, timestamp, data, date"
                  class="input"
                />
              </label>
            </div>
          </form>

          <div class="section-title">Segurança</div>
          <form class="mapping-form">
            <div class="field-group">
              <label>
                <span class="field-label">Token de Autenticação (opcional)</span>
                <span class="field-hint">Token que deve ser enviado no header 'Authorization'. Deixe vazio para desabilitar validação de token.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.security.token" 
                  name="army-token"
                  placeholder="Ex: army-secret-token-123"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">IP Permitido (opcional)</span>
                <span class="field-hint">IP que pode fazer requisições. Deixe vazio para permitir qualquer IP.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.army.security.allowedIp" 
                  name="army-ip"
                  placeholder="Ex: 127.0.0.1, 192.168.1.100"
                  class="input"
                />
              </label>
            </div>
          </form>
        </div>

        <div class="card">
          <h2>🚔 PMERJ</h2>
          <p class="description">Configure o mapeamento dos campos recebidos do servidor PMERJ</p>
          
          <div class="section-title">Mapeamento de Campos</div>
          <form class="mapping-form">
            <div class="field-group">
              <label>
                <span class="field-label">ID (opcional)</span>
                <span class="field-hint">Campo do JSON que contém o identificador único. Deixe vazio para gerar automaticamente.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.mapping.id" 
                  name="pmerj-id"
                  placeholder="Ex: identificador, id, codigo"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Nome *</span>
                <span class="field-hint">Campo do JSON que contém o nome do evento</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.mapping.nome" 
                  name="pmerj-nome"
                  required
                  placeholder="Ex: nome, titulo, name"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Descrição (opcional)</span>
                <span class="field-hint">Campo do JSON que contém a descrição do evento</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.mapping.descricao" 
                  name="pmerj-descricao"
                  placeholder="Ex: descricao, description, detalhes"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Latitude *</span>
                <span class="field-hint">Campo do JSON que contém a latitude</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.mapping.latitude" 
                  name="pmerj-latitude"
                  required
                  placeholder="Ex: latitude, lat, latitud"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Longitude *</span>
                <span class="field-hint">Campo do JSON que contém a longitude</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.mapping.longitude" 
                  name="pmerj-longitude"
                  required
                  placeholder="Ex: longitude, lng, long, longitud"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">Timestamp (opcional)</span>
                <span class="field-hint">Campo do JSON que contém o timestamp. Deixe vazio para usar o timestamp atual.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.mapping.ts" 
                  name="pmerj-ts"
                  placeholder="Ex: ts, timestamp, data, date"
                  class="input"
                />
              </label>
            </div>
          </form>

          <div class="section-title">Segurança</div>
          <form class="mapping-form">
            <div class="field-group">
              <label>
                <span class="field-label">Token de Autenticação (opcional)</span>
                <span class="field-hint">Token que deve ser enviado no header 'Authorization'. Deixe vazio para desabilitar validação de token.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.security.token" 
                  name="pmerj-token"
                  placeholder="Ex: pmerj-secret-token-456"
                  class="input"
                />
              </label>
            </div>

            <div class="field-group">
              <label>
                <span class="field-label">IP Permitido (opcional)</span>
                <span class="field-hint">IP que pode fazer requisições. Deixe vazio para permitir qualquer IP.</span>
                <input 
                  type="text" 
                  [(ngModel)]="config.pmerj.security.allowedIp" 
                  name="pmerj-ip"
                  placeholder="Ex: 127.0.0.1, 192.168.1.100"
                  class="input"
                />
              </label>
            </div>
          </form>
        </div>
      </div>

      <div class="actions">
        <button type="button" (click)="reset()" class="btn btn-secondary">Restaurar Padrão</button>
        <button type="button" (click)="cancel()" class="btn btn-secondary">Voltar</button>
        <button type="button" (click)="save()" [disabled]="loading || !isValid()" class="btn btn-primary">
          {{ loading ? 'Salvando...' : 'Salvar Mapeamento' }}
        </button>
      </div>

      <div *ngIf="message" [class]="'message ' + messageType">
        {{ message }}
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 2.5rem;
      margin: 0 0 10px 0;
      font-weight: 700;
    }

    .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      margin: 0;
    }

    .content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }

    @media (max-width: 968px) {
      .content {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .card h2 {
      margin: 0 0 8px 0;
      color: #0f172a;
      font-size: 1.5rem;
    }

    .description {
      color: #64748b;
      font-size: 0.9rem;
      margin: 0 0 20px 0;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      margin: 24px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    .section-title:first-of-type {
      margin-top: 0;
    }

    .mapping-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-group label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field-label {
      font-weight: 600;
      color: #0f172a;
      font-size: 0.95rem;
    }

    .field-hint {
      font-size: 0.85rem;
      color: #64748b;
      font-style: italic;
    }

    .input {
      padding: 10px 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;
    }

    .input:focus {
      outline: none;
      border-color: #667eea;
    }

    .input::placeholder {
      color: #94a3b8;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #0f172a;
    }

    .btn-secondary:hover {
      background: #cbd5e1;
    }

    .message {
      margin-top: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
    }

    .message.success {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }

    .message.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
  `]
})
export class MapeamentoComponent implements OnInit {
  private mapeamentoService = inject(MapeamentoService);
  private router = inject(Router);

  config: MapeamentoConfig = { ...DEFAULT_MAPPING };
  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  ngOnInit() {
    // Use setTimeout to ensure this runs after hydration
    setTimeout(() => {
      console.log('[COMPONENT] ngOnInit - Loading mapeamento from server...');
      this.mapeamentoService.getMapeamento().subscribe({
        next: (config) => {
          console.log('[COMPONENT] ✓ Mapeamento loaded from server:', JSON.stringify(config, null, 2));
          console.log('[COMPONENT] Army allowedIp loaded:', config.army.security.allowedIp);
          console.log('[COMPONENT] PMERJ allowedIp loaded:', config.pmerj.security.allowedIp);
          this.config = config;
          console.log('[COMPONENT] Config updated in component:', JSON.stringify(this.config, null, 2));
        },
        error: (error) => {
          // Se não existir configuração, usa a padrão
          console.error('[COMPONENT] ✗ Error loading mapeamento:', error);
          console.log('[COMPONENT] Using default configuration');
          this.config = { ...DEFAULT_MAPPING };
        }
      });
    }, 0);
  }

  isValid(): boolean {
    return !!(
      this.config.army.mapping.nome?.trim() &&
      this.config.army.mapping.latitude?.trim() &&
      this.config.army.mapping.longitude?.trim() &&
      this.config.pmerj.mapping.nome?.trim() &&
      this.config.pmerj.mapping.latitude?.trim() &&
      this.config.pmerj.mapping.longitude?.trim()
    );
  }

  save() {
    if (!this.isValid()) {
      this.message = 'Por favor, preencha todos os campos obrigatórios (*)';
      this.messageType = 'error';
      return;
    }

    this.loading = true;
    this.message = '';

    // Log detalhado do que está sendo enviado
    console.log('[FRONTEND] ========================================');
    console.log('[FRONTEND] SAVE - Current config object:');
    console.log('[FRONTEND]   this.config:', this.config);
    console.log('[FRONTEND]   this.config.army:', this.config.army);
    console.log('[FRONTEND]   this.config.army.security:', this.config.army.security);
    console.log('[FRONTEND]   this.config.army.security.allowedIp:', this.config.army.security.allowedIp);
    console.log('[FRONTEND]   typeof this.config.army.security.allowedIp:', typeof this.config.army.security.allowedIp);
    console.log('[FRONTEND] SAVE - JSON stringified:');
    console.log(JSON.stringify(this.config, null, 2));
    console.log('[FRONTEND] ========================================');

    // Criar uma cópia profunda para garantir que não há referências compartilhadas
    const configToSend = JSON.parse(JSON.stringify(this.config));
    console.log('[FRONTEND] Config to send (deep copy):', JSON.stringify(configToSend, null, 2));
    console.log('[FRONTEND] Army allowedIp in copy:', configToSend.army.security.allowedIp);

    console.log('[COMPONENT] Calling updateMapeamento service...');
    this.mapeamentoService.updateMapeamento(configToSend).subscribe({
      next: (response) => {
        console.log('[COMPONENT] ✓ Success callback - Response:', response);
        this.message = 'Mapeamento salvo com sucesso!';
        this.messageType = 'success';
        this.loading = false;
        // Update local config with response
        this.config = response;
        setTimeout(() => {
          this.message = '';
        }, 3000);
      },
      error: (error) => {
        console.error('[COMPONENT] ✗ Error callback:', error);
        console.error('[COMPONENT] Error details:', JSON.stringify(error, null, 2));
        this.message = 'Erro ao salvar mapeamento: ' + (error.message || 'Erro desconhecido');
        this.messageType = 'error';
        this.loading = false;
      }
    });
  }

  reset() {
    this.config = { ...DEFAULT_MAPPING };
    this.message = '';
  }

  cancel() {
    this.router.navigateByUrl('/mapa');
  }
}
