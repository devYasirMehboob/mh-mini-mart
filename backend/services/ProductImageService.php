<?php

declare(strict_types=1);

namespace App\Services;

use App\Http\HttpException;
use finfo;

final class ProductImageService
{
    private const MAX_BYTES = 2097152;

    private const ALLOWED_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function __construct(
        private readonly string $uploadDirectory,
        private readonly string $relativeDirectory = 'uploads/products'
    ) {
    }

    public function store(?string $imageData): ?string
    {
        if ($imageData === null || $imageData === '') {
            return null;
        }

        if (!preg_match('#^data:image/[a-zA-Z0-9.+-]+;base64,#', $imageData)) {
            throw new HttpException(
                'The product image could not be uploaded.',
                422,
                ['image' => ['Select a valid JPG, PNG, or WebP image.']]
            );
        }

        $encoded = substr($imageData, strpos($imageData, ',') + 1);
        $binary = base64_decode($encoded, true);

        if ($binary === false || $binary === '') {
            throw new HttpException(
                'The product image could not be uploaded.',
                422,
                ['image' => ['The image data is invalid.']]
            );
        }

        if (strlen($binary) > self::MAX_BYTES) {
            throw new HttpException(
                'The product image could not be uploaded.',
                422,
                ['image' => ['The image must not exceed 2 MB.']]
            );
        }

        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->buffer($binary);
        $extension = self::ALLOWED_TYPES[$mimeType] ?? null;

        if ($extension === null) {
            throw new HttpException(
                'The product image could not be uploaded.',
                422,
                ['image' => ['Only JPG, PNG, and WebP images are allowed.']]
            );
        }

        if (!is_dir($this->uploadDirectory)
            && !mkdir($this->uploadDirectory, 0755, true)
            && !is_dir($this->uploadDirectory)
        ) {
            throw new HttpException('The product image could not be saved.', 500);
        }

        $filename = bin2hex(random_bytes(20)) . '.' . $extension;
        $absolutePath = $this->uploadDirectory . DIRECTORY_SEPARATOR . $filename;

        if (file_put_contents($absolutePath, $binary, LOCK_EX) === false) {
            throw new HttpException('The product image could not be saved.', 500);
        }

        return $this->relativeDirectory . '/' . $filename;
    }

    public function delete(?string $relativePath): void
    {
        if ($relativePath === null || $relativePath === '') {
            return;
        }

        $filename = basename(str_replace('\\', '/', $relativePath));
        $absolutePath = $this->uploadDirectory . DIRECTORY_SEPARATOR . $filename;

        if (is_file($absolutePath)) {
            unlink($absolutePath);
        }
    }
}
