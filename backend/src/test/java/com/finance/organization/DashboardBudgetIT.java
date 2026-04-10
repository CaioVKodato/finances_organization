package com.finance.organization;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

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
    void dependentExpenseDoesNotAffectSelfBudget() throws Exception {
        MvcResult reg = mockMvc.perform(
                        post("/api/auth/register")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"email":"user@test.com","password":"senha12345"}
                                        """))
                .andExpect(status().isCreated())
                .andReturn();
        String token = JsonPath.read(reg.getResponse().getContentAsString(), "$.token");

        mockMvc.perform(
                        post("/api/cards")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"name":"Visa","lastFourDigits":"","colorHex":"#6366f1","invoiceClosingDay":null}
                                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        mockMvc.perform(
                        post("/api/cards/1/dependents")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\"Mãe\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));

        mockMvc.perform(
                        put("/api/settings")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"monthlyIncome\":5000}"))
                .andExpect(status().isOk());

        String today = LocalDate.now().toString();
        mockMvc.perform(
                        post("/api/expenses")
                                .header("Authorization", "Bearer " + token)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "cardId": 1,
                                          "amount": 1600,
                                          "description": "Compra mae",
                                          "expenseDate": "%s",
                                          "spentBySelf": false,
                                          "dependentPersonId": 1,
                                          "notes": null,
                                          "installmentCount": 1
                                        }
                                        """
                                                .formatted(today)))
                .andExpect(status().isCreated());

        mockMvc.perform(
                        get("/api/dashboard/summary")
                                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyIncome").value(5000))
                .andExpect(jsonPath("$.spentSelfInCurrentCalendarMonth").value(0))
                .andExpect(jsonPath("$.spentAllInCurrentCalendarMonth").value(1600))
                .andExpect(jsonPath("$.remainingBudget").value(5000));
    }
}
