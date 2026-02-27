-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_shopId_idx" ON "Invoice"("shopId");

-- CreateIndex
CREATE INDEX "StockLog_shopId_idx" ON "StockLog"("shopId");

-- CreateIndex
CREATE INDEX "StockLog_itemId_idx" ON "StockLog"("itemId");
