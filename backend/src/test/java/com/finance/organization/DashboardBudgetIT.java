package com.finance.organization;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardBudgetIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void motherExpenseDoesNotAffectRemainingBudget() throws Exception {
        mockMvc.perform(
                post("/api/cards")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {"name":"Visa","lastFourDigits":"","colorHex":"#6366f1","invoiceClosingDay":null}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists());

        mockMvc.perform(
                        put("/api/settings")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"monthlyIncome\":5000}"))
                .andExpect(status().isOk());

        String today = LocalDate.now().toString();
        mockMvc.perform(
                post("/api/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                """
                                {
                                  "cardId": 1,
                                  "amount": 1600,
                                  "description": "Compra mae",
                                  "expenseDate": "%s",
                                  "spentBy": "MOTHER",
                                  "notes": null,
                                  "installmentCount": 1
                                }
                                """
                                        .formatted(today)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyIncome").value(5000))
                .andExpect(jsonPath("$.spentSelfInCurrentCalendarMonth").value(0))
                .andExpect(jsonPath("$.spentAllInCurrentCalendarMonth").value(1600))
                .andExpect(jsonPath("$.remainingBudget").value(5000));
    }
}
