<?php
declare(strict_types=1);

/** Excepción de reglas del dominio, independiente de los códigos HTTP. */
final class DomainError extends RuntimeException {
    private string $category;

    public function __construct(string $category, string $message) {
        parent::__construct($message);
        $this->category = $category;
    }

    public function category(): string {
        return $this->category;
    }
}
