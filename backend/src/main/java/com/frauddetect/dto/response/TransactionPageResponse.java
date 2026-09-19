package com.frauddetect.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionPageResponse {
    private List<TransactionListItemDto> content;
    private long totalElements;
    private int totalPages;
    private int pageNumber;
    private int pageSize;
}
