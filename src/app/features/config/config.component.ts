import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfigService, ServerConfig } from './config.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent implements OnInit {
  private configService = inject(ConfigService);
  private router = inject(Router);

  config: ServerConfig = { ipArmy: 'ip_army', ipPMERJ: 'ip_pmerj' };
  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  ngOnInit() {
    this.configService.getConfig().subscribe(config => {
      this.config = { ...config };
    });
  }

  save() {
    this.loading = true;
    this.message = '';
    
    this.configService.updateConfig(this.config).subscribe({
      next: () => {
        this.message = 'Configuração salva com sucesso!';
        this.messageType = 'success';
        this.loading = false;
        setTimeout(() => {
          this.message = '';
        }, 3000);
      },
      error: (error) => {
        this.message = 'Erro ao salvar configuração: ' + (error.message || 'Erro desconhecido');
        this.messageType = 'error';
        this.loading = false;
      }
    });
  }

  cancel() {
    this.router.navigateByUrl('/mapa');
  }
}

